"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Video, WifiOff } from "lucide-react";
import type { IAgoraRTCClient, IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";

type AgoraLivePlayerProps = {
    feederId: string;
    channelName: string;
};

type PlayerState = "connecting" | "waiting" | "playing" | "error";

export default function AgoraLivePlayer({ feederId, channelName }: AgoraLivePlayerProps) {
    const videoRef = useRef<HTMLDivElement>(null);
    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const [state, setState] = useState<PlayerState>("connecting");
    const [message, setMessage] = useState("Connecting to live camera...");

    useEffect(() => {
        let cancelled = false;

        const clearRemoteTracks = (users: IAgoraRTCRemoteUser[]) => {
            for (const user of users) {
                user.videoTrack?.stop();
                user.audioTrack?.stop();
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

                const { appId, token, uid, channel } = await tokenResponse.json();
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

        joinChannel();

        return () => {
            cancelled = true;
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
        <div className="relative w-full h-full bg-black">
            <div ref={videoRef} className="absolute inset-0 w-full h-full [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-full" />
            {state !== "playing" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 text-white font-mono text-sm">
                    {state === "connecting" ? (
                        <Loader2 className="w-9 h-9 animate-spin text-primary" />
                    ) : state === "error" ? (
                        <WifiOff className="w-10 h-10 text-red-400" />
                    ) : (
                        <Video className="w-10 h-10 text-primary" />
                    )}
                    <p>{message}</p>
                </div>
            )}
        </div>
    );
}
