"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Users, Video, WifiOff } from "lucide-react";
import type { IAgoraRTCClient, IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

type AgoraLivePlayerProps = {
    feederId: string;
    channelName: string;
};

type PlayerState = "connecting" | "waiting" | "playing" | "error";

type TokenResponse = {
    appId: string;
    channel: string;
    expiresIn: number;
    streamId: string;
    token: string;
    uid: number;
    viewerCount: number;
};

const VIEWER_COUNT_SYNC_INTERVAL_MS = 15_000;

function countPresenceMembers(state: Record<string, unknown[]>) {
    return Object.values(state).reduce((total, entries) => total + entries.length, 0);
}

export default function AgoraLivePlayer({ feederId, channelName }: AgoraLivePlayerProps) {
    const videoRef = useRef<HTMLDivElement>(null);
    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const viewerCountRef = useRef(0);
    const [state, setState] = useState<PlayerState>("connecting");
    const [message, setMessage] = useState("Connecting to live camera...");
    const [viewerCount, setViewerCount] = useState(0);

    useEffect(() => {
        const supabase = createSupabaseClient();
        let cancelled = false;
        let presenceChannel: RealtimeChannel | null = null;
        let livestreamChannel: RealtimeChannel | null = null;
        let presenceIntervalId: number | null = null;
        let activeStreamId: string | null = null;
        let viewerSessionId: string | null = null;

        const updateViewerCount = (nextCount: number) => {
            viewerCountRef.current = nextCount;
            if (!cancelled) {
                setViewerCount(nextCount);
            }
        };

        const clearRemoteTracks = (users: IAgoraRTCRemoteUser[]) => {
            for (const user of users) {
                user.videoTrack?.stop();
                user.audioTrack?.stop();
            }
        };

        const publishViewerCount = async (streamId: string, nextCount: number, keepalive = false) => {
            const response = await fetch("/api/livestreams/viewer-count", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    streamId,
                    viewerCount: Math.max(0, Math.floor(nextCount)),
                }),
                keepalive,
            });

            if (!response.ok) {
                throw new Error(`Viewer count sync failed with status ${response.status}`);
            }

            const data = (await response.json()) as { viewerCount?: number };
            updateViewerCount(Number(data.viewerCount ?? nextCount));
        };

        const sendViewerCountBeacon = (streamId: string, nextCount: number) => {
            const payload = JSON.stringify({
                streamId,
                viewerCount: Math.max(0, Math.floor(nextCount)),
            });

            if (navigator.sendBeacon) {
                navigator.sendBeacon(
                    "/api/livestreams/viewer-count",
                    new Blob([payload], { type: "application/json" })
                );
                return;
            }

            fetch("/api/livestreams/viewer-count", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: payload,
                keepalive: true,
            }).catch((error) => console.error(error));
        };

        const getViewerSessionId = (streamId: string) => {
            const storageKey = `pawbit-stream-viewer:${streamId}`;
            const existing = window.sessionStorage.getItem(storageKey);
            if (existing) {
                return existing;
            }

            const nextId = crypto.randomUUID();
            window.sessionStorage.setItem(storageKey, nextId);
            return nextId;
        };

        const syncPresenceCount = async () => {
            if (!presenceChannel || !activeStreamId) {
                return;
            }

            const nextCount = countPresenceMembers(
                presenceChannel.presenceState() as Record<string, unknown[]>
            );
            updateViewerCount(nextCount);

            try {
                await publishViewerCount(activeStreamId, nextCount);
            } catch (error) {
                console.error(error);
            }
        };

        const joinChannel = async () => {
            try {
                setState("connecting");
                setMessage("Connecting to live camera...");

                const tokenResponse = await fetch(
                    `/api/agora/token?feederId=${encodeURIComponent(feederId)}&channel=${encodeURIComponent(channelName)}`
                );

                if (!tokenResponse.ok) {
                    throw new Error("Could not request Agora token");
                }

                const { appId, token, uid, channel, streamId, viewerCount: initialViewerCount } =
                    (await tokenResponse.json()) as TokenResponse;

                activeStreamId = streamId;
                viewerSessionId = getViewerSessionId(streamId);
                updateViewerCount(Number(initialViewerCount ?? 0));

                presenceChannel = supabase.channel(`presence:pawbit-feeder-${feederId}`, {
                    config: {
                        presence: {
                            key: viewerSessionId,
                        },
                    },
                });

                presenceChannel
                    .on("presence", { event: "sync" }, () => {
                        void syncPresenceCount();
                    })
                    .on("presence", { event: "join" }, () => {
                        void syncPresenceCount();
                    })
                    .on("presence", { event: "leave" }, () => {
                        void syncPresenceCount();
                    })
                    .subscribe((status) => {
                        if (status === "SUBSCRIBED" && presenceChannel) {
                            presenceChannel.track({ online_at: new Date().toISOString() }).catch((error) => {
                                console.error(error);
                            });
                        }
                    });

                livestreamChannel = supabase
                    .channel(`livestream-count-${streamId}`)
                    .on(
                        "postgres_changes",
                        {
                            event: "UPDATE",
                            schema: "public",
                            table: "livestreams",
                            filter: `id=eq.${streamId}`,
                        },
                        (payload) => {
                            updateViewerCount(Number(payload.new.viewer_count ?? 0));
                        }
                    )
                    .subscribe();

                presenceIntervalId = window.setInterval(() => {
                    void syncPresenceCount();
                }, VIEWER_COUNT_SYNC_INTERVAL_MS);

                const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
                const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

                clientRef.current = client;
                client.setClientRole("audience");

                client.on("user-published", async (user, mediaType) => {
                    await client.subscribe(user, mediaType);
                    if (cancelled) return;

                    if (mediaType === "video" && user.videoTrack && videoRef.current) {
                        user.videoTrack.play(videoRef.current);
                        setState("playing");
                        setMessage("");
                    }

                    if (mediaType === "audio" && user.audioTrack) {
                        user.audioTrack.play();
                    }
                });

                client.on("user-unpublished", (user) => {
                    user.videoTrack?.stop();
                    user.audioTrack?.stop();
                    if (!cancelled) {
                        setState("waiting");
                        setMessage("Waiting for camera signal...");
                    }
                });

                client.on("user-left", () => {
                    if (!cancelled) {
                        setState("waiting");
                        setMessage("Camera signal ended");
                    }
                });

                await client.join(appId, channel, token, uid);

                if (!cancelled && client.remoteUsers.length === 0) {
                    setState("waiting");
                    setMessage("Waiting for camera signal...");
                }
            } catch (error) {
                console.error(error);
                if (!cancelled) {
                    setState("error");
                    setMessage("Live video is unavailable");
                }
            }
        };

        const handlePageHide = () => {
            if (!activeStreamId) {
                return;
            }

            const nextCount = Math.max(viewerCountRef.current - 1, 0);
            sendViewerCountBeacon(activeStreamId, nextCount);
        };

        window.addEventListener("pagehide", handlePageHide);
        void joinChannel();

        return () => {
            cancelled = true;
            window.removeEventListener("pagehide", handlePageHide);

            if (presenceIntervalId !== null) {
                window.clearInterval(presenceIntervalId);
            }

            if (presenceChannel) {
                presenceChannel.untrack().catch((error) => console.error(error));
                supabase.removeChannel(presenceChannel).catch((error) => console.error(error));
            }

            if (livestreamChannel) {
                supabase.removeChannel(livestreamChannel).catch((error) => console.error(error));
            }

            if (activeStreamId) {
                const nextCount = Math.max(viewerCountRef.current - 1, 0);
                sendViewerCountBeacon(activeStreamId, nextCount);
            }

            const client = clientRef.current;
            clientRef.current = null;
            if (client) {
                clearRemoteTracks(client.remoteUsers);
                client.removeAllListeners();
                client.leave().catch((error) => console.error(error));
            }
        };
    }, [feederId, channelName]);

    return (
        <div className="relative h-full w-full bg-black">
            <div
                ref={videoRef}
                className="absolute inset-0 h-full w-full [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
            />
            <div className="absolute right-4 top-4 z-20 rounded-full bg-black/70 px-3 py-1 text-xs font-mono text-white backdrop-blur">
                <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {viewerCount} watching
                </span>
            </div>
            {state !== "playing" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 text-sm font-mono text-white">
                    {state === "connecting" ? (
                        <Loader2 className="h-9 w-9 animate-spin text-primary" />
                    ) : state === "error" ? (
                        <WifiOff className="h-10 w-10 text-red-400" />
                    ) : (
                        <Video className="h-10 w-10 text-primary" />
                    )}
                    <p>{message}</p>
                </div>
            )}
        </div>
    );
}
