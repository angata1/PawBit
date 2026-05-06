"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Expand, Loader2, Maximize2, Minimize2, Pause, Play, RotateCcw, Square, Trash2, Users, Video, WifiOff } from "lucide-react";
import type { IAgoraRTCClient, IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";

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

const VIEWER_COUNT_SYNC_INTERVAL_MS = 10_000;
const MAX_CLIP_DURATION_MS = 30_000;
const DVR_CHUNK_INTERVAL_MS = 1_000;
const MAX_DVR_BUFFER_MS = 10 * 60 * 1_000;

type DvrChunk = {
    blob: Blob;
    durationMs: number;
};

export default function AgoraLivePlayer({ feederId, channelName }: AgoraLivePlayerProps) {
    const playerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLDivElement>(null);
    const delayedVideoRef = useRef<HTMLVideoElement>(null);
    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const viewerCountRef = useRef(0);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const clipChunksRef = useRef<Blob[]>([]);
    const clipTimerRef = useRef<number | null>(null);
    const clipUrlRef = useRef<string | null>(null);
    const dvrRecorderRef = useRef<MediaRecorder | null>(null);
    const dvrChunksRef = useRef<DvrChunk[]>([]);
    const dvrUrlRef = useRef<string | null>(null);
    const dvrLastChunkAtRef = useRef<number | null>(null);
    const dvrBufferStartSecondsRef = useRef(0);
    const dvrBufferedEndSecondsRef = useRef(0);
    const isWatchingDelayedRef = useRef(false);
    const startLocalDvrRef = useRef<() => void>(() => undefined);
    const stopLocalDvrRef = useRef<() => void>(() => undefined);
    const backToLiveRef = useRef<() => void>(() => undefined);
    const controlsHideTimerRef = useRef<number | null>(null);
    const [state, setState] = useState<PlayerState>("connecting");
    const [message, setMessage] = useState("Connecting to live camera...");
    const [viewerCount, setViewerCount] = useState(0);
    const [isRecordingClip, setIsRecordingClip] = useState(false);
    const [clipPreviewUrl, setClipPreviewUrl] = useState("");
    const [clipStatus, setClipStatus] = useState("");
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [dvrSupported, setDvrSupported] = useState(true);
    const [dvrStatus, setDvrStatus] = useState("Preparing local replay buffer...");
    const [isWatchingDelayed, setIsWatchingDelayed] = useState(false);
    const [isDelayedPlaying, setIsDelayedPlaying] = useState(false);
    const [dvrBufferStartSeconds, setDvrBufferStartSeconds] = useState(0);
    const [dvrBufferedEndSeconds, setDvrBufferedEndSeconds] = useState(0);
    const [dvrPlayheadSeconds, setDvrPlayheadSeconds] = useState(0);
    const [showControls, setShowControls] = useState(true);
    isWatchingDelayedRef.current = isWatchingDelayed;

    const clearClipPreview = () => {
        if (clipUrlRef.current) {
            URL.revokeObjectURL(clipUrlRef.current);
            clipUrlRef.current = null;
        }
        setClipPreviewUrl("");
        setClipStatus("");
    };

    const getRemoteMediaStream = () => {
        const remoteUser = clientRef.current?.remoteUsers.find((user) => user.videoTrack);
        const videoTrack = remoteUser?.videoTrack as unknown as { getMediaStreamTrack?: () => MediaStreamTrack } | undefined;
        const mediaTracks = [videoTrack?.getMediaStreamTrack?.()].filter((track): track is MediaStreamTrack => Boolean(track));

        return mediaTracks.length > 0 ? new MediaStream(mediaTracks) : null;
    };

    const getWebmMimeType = () => {
        if (!window.MediaRecorder) return null;

        const preferredType = "video/webm;codecs=vp8";
        const fallbackType = "video/webm";
        if (MediaRecorder.isTypeSupported(preferredType)) return preferredType;
        if (MediaRecorder.isTypeSupported(fallbackType)) return fallbackType;
        return "";
    };

    const formatDvrTime = (seconds: number) => {
        const safeSeconds = Math.max(0, Math.floor(seconds));
        const minutes = Math.floor(safeSeconds / 60);
        const remainingSeconds = safeSeconds % 60;
        return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
    };

    const revokeDvrUrl = () => {
        if (dvrUrlRef.current) {
            URL.revokeObjectURL(dvrUrlRef.current);
            dvrUrlRef.current = null;
        }
    };

    const refreshDvrWindow = () => {
        const totalDurationMs = dvrChunksRef.current.reduce((total, chunk) => total + chunk.durationMs, 0);
        dvrBufferedEndSecondsRef.current = dvrBufferStartSecondsRef.current + totalDurationMs / 1000;
        setDvrBufferStartSeconds(dvrBufferStartSecondsRef.current);
        setDvrBufferedEndSeconds(dvrBufferedEndSecondsRef.current);

        if (!isWatchingDelayedRef.current) {
            setDvrPlayheadSeconds(dvrBufferedEndSecondsRef.current);
        }
    };

    const createDvrPlaybackUrl = () => {
        revokeDvrUrl();
        const blob = new Blob(dvrChunksRef.current.map((chunk) => chunk.blob), { type: "video/webm" });
        const nextUrl = URL.createObjectURL(blob);
        dvrUrlRef.current = nextUrl;
        return nextUrl;
    };

    const loadDvrPlayback = (absoluteSeconds: number, shouldPlay: boolean) => {
        const video = delayedVideoRef.current;
        if (!video || dvrChunksRef.current.length === 0) return;

        const targetSeconds = Math.min(
            Math.max(absoluteSeconds, dvrBufferStartSecondsRef.current),
            dvrBufferedEndSecondsRef.current
        );
        const relativeSeconds = Math.max(0, targetSeconds - dvrBufferStartSecondsRef.current);
        const url = createDvrPlaybackUrl();

        setIsWatchingDelayed(true);
        setDvrPlayheadSeconds(targetSeconds);
        video.src = url;
        video.onloadedmetadata = () => {
            video.currentTime = Math.min(relativeSeconds, Number.isFinite(video.duration) ? video.duration : relativeSeconds);
            if (shouldPlay) {
                video.play().catch((error) => {
                    console.error(error);
                    setIsDelayedPlaying(false);
                });
            }
        };
    };

    const startLocalDvr = () => {
        if (dvrRecorderRef.current) return;

        const mimeType = getWebmMimeType();
        if (mimeType === null) {
            setDvrSupported(false);
            setDvrStatus("Local replay is not supported in this browser.");
            return;
        }

        const stream = getRemoteMediaStream();
        if (!stream) return;

        try {
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            dvrChunksRef.current = [];
            dvrLastChunkAtRef.current = performance.now();
            dvrBufferStartSecondsRef.current = 0;
            dvrBufferedEndSecondsRef.current = 0;
            setDvrBufferStartSeconds(0);
            setDvrBufferedEndSeconds(0);
            setDvrPlayheadSeconds(0);
            setDvrStatus("Local replay buffer active.");

            recorder.ondataavailable = (event) => {
                if (event.data.size <= 0) return;

                const now = performance.now();
                const lastChunkAt = dvrLastChunkAtRef.current ?? now;
                const durationMs = Math.max(250, now - lastChunkAt);
                dvrLastChunkAtRef.current = now;
                dvrChunksRef.current.push({ blob: event.data, durationMs });

                let totalDurationMs = dvrChunksRef.current.reduce((total, chunk) => total + chunk.durationMs, 0);
                while (totalDurationMs > MAX_DVR_BUFFER_MS && dvrChunksRef.current.length > 1) {
                    const removed = dvrChunksRef.current.shift();
                    if (!removed) break;
                    totalDurationMs -= removed.durationMs;
                    dvrBufferStartSecondsRef.current += removed.durationMs / 1000;
                }

                refreshDvrWindow();
            };

            recorder.onerror = (event) => {
                console.error(event);
                setDvrSupported(false);
                setDvrStatus("Local replay stopped because this browser could not record the stream.");
            };

            dvrRecorderRef.current = recorder;
            recorder.start(DVR_CHUNK_INTERVAL_MS);
        } catch (error) {
            console.error(error);
            setDvrSupported(false);
            setDvrStatus("Local replay is not available for this stream.");
        }
    };

    const stopLocalDvr = () => {
        const recorder = dvrRecorderRef.current;
        dvrRecorderRef.current = null;
        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
        }
        revokeDvrUrl();
    };

    const seekDvr = (absoluteSeconds: number, shouldPlay = isDelayedPlaying) => {
        if (!dvrSupported || dvrChunksRef.current.length === 0) return;
        loadDvrPlayback(absoluteSeconds, shouldPlay);
    };

    const toggleDelayedPlayback = () => {
        const video = delayedVideoRef.current;
        if (!video || !isWatchingDelayed) {
            seekDvr(Math.max(dvrBufferStartSeconds, dvrBufferedEndSeconds - 10), true);
            setIsDelayedPlaying(true);
            return;
        }

        if (video.paused) {
            video.play().catch((error) => console.error(error));
            setIsDelayedPlaying(true);
        } else {
            video.pause();
            setIsDelayedPlaying(false);
        }
    };

    const backToLive = () => {
        const video = delayedVideoRef.current;
        if (video) {
            video.pause();
            video.removeAttribute("src");
            video.load();
        }
        revokeDvrUrl();
        setIsWatchingDelayed(false);
        setIsDelayedPlaying(false);
        setDvrPlayheadSeconds(dvrBufferedEndSecondsRef.current);
    };

    const handleDelayedTimeUpdate = () => {
        const video = delayedVideoRef.current;
        if (!video) return;

        const nextPlayhead = dvrBufferStartSecondsRef.current + video.currentTime;
        setDvrPlayheadSeconds(Math.min(nextPlayhead, dvrBufferedEndSecondsRef.current));
    };

    startLocalDvrRef.current = startLocalDvr;
    stopLocalDvrRef.current = stopLocalDvr;
    backToLiveRef.current = backToLive;

    const stopClipRecording = () => {
        if (clipTimerRef.current !== null) {
            window.clearTimeout(clipTimerRef.current);
            clipTimerRef.current = null;
        }

        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
        }
    };

    const startClipRecording = () => {
        if (isRecordingClip) return;
        clearClipPreview();

        if (!window.MediaRecorder) {
            setClipStatus("Clip recording is not supported in this browser.");
            return;
        }

        const stream = getRemoteMediaStream();
        if (!stream) {
            setClipStatus("Start the livestream before recording a clip.");
            return;
        }

        const preferredType = "video/webm;codecs=vp8,opus";
        const fallbackType = "video/webm";
        const mimeType = MediaRecorder.isTypeSupported(preferredType)
            ? preferredType
            : MediaRecorder.isTypeSupported(fallbackType)
                ? fallbackType
                : "";

        try {
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            clipChunksRef.current = [];
            recorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    clipChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const type = recorder.mimeType || "video/webm";
                const nextBlob = new Blob(clipChunksRef.current, { type });
                const nextUrl = URL.createObjectURL(nextBlob);
                clipUrlRef.current = nextUrl;
                recorderRef.current = null;
                setIsRecordingClip(false);
                setClipPreviewUrl(nextUrl);
                setClipStatus("Clip ready to preview.");
            };

            recorder.start();
            setIsRecordingClip(true);
            setClipStatus("Recording clip...");
            clipTimerRef.current = window.setTimeout(stopClipRecording, MAX_CLIP_DURATION_MS);
        } catch (error) {
            console.error(error);
            setClipStatus("Could not start clip recording.");
            setIsRecordingClip(false);
        }
    };

    const downloadClip = () => {
        if (!clipPreviewUrl) return;
        const link = document.createElement("a");
        link.href = clipPreviewUrl;
        link.download = `pawbit-${feederId}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`;
        link.click();
        setClipStatus("Clip saved to your device.");
    };

    const toggleFullscreen = () => {
        const element = playerRef.current;
        if (!element) return;

        if (document.fullscreenElement) {
            document.exitFullscreen().catch((error) => console.error(error));
            return;
        }

        element.requestFullscreen().catch((error) => console.error(error));
    };

    const scheduleControlsHide = () => {
        if (controlsHideTimerRef.current !== null) {
            window.clearTimeout(controlsHideTimerRef.current);
        }

        controlsHideTimerRef.current = window.setTimeout(() => {
            if (!playerRef.current?.matches(":hover") && !playerRef.current?.contains(document.activeElement)) {
                setShowControls(false);
            }
        }, 1600);
    };

    const revealControls = () => {
        setShowControls(true);
        scheduleControlsHide();
    };

    const hideControlsIfUnfocused = () => {
        if (!playerRef.current?.contains(document.activeElement)) {
            setShowControls(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        let viewerPollIntervalId: number | null = null;

        const updateViewerCount = (nextCount: number) => {
            viewerCountRef.current = nextCount;
            if (!cancelled) {
                setViewerCount(nextCount);
            }
        };

        const clearRemoteTracks = (users: IAgoraRTCRemoteUser[]) => {
            for (const user of users) {
                user.videoTrack?.stop();
            }
        };

        const syncAgoraViewerCount = async () => {
            try {
                const response = await fetch(`/api/agora/viewers?channel=${encodeURIComponent(channelName)}`, {
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error(`Agora viewer query failed with status ${response.status}`);
                }

                const data = (await response.json()) as { viewerCount?: number };
                updateViewerCount(Number(data.viewerCount ?? 0));
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

                const { appId, token, uid, channel, viewerCount: initialViewerCount } =
                    (await tokenResponse.json()) as TokenResponse;

                updateViewerCount(Number(initialViewerCount ?? 0));
                void syncAgoraViewerCount();
                viewerPollIntervalId = window.setInterval(() => {
                    void syncAgoraViewerCount();
                }, VIEWER_COUNT_SYNC_INTERVAL_MS);

                const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
                const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

                clientRef.current = client;
                client.setClientRole("audience");

                client.on("user-published", async (user, mediaType) => {
                    if (mediaType !== "video") {
                        return;
                    }

                    await client.subscribe(user, mediaType);
                    if (cancelled) return;

                    if (mediaType === "video" && user.videoTrack && videoRef.current) {
                        user.videoTrack.play(videoRef.current);
                        setState("playing");
                        setMessage("");
                        startLocalDvrRef.current();
                    }

                });

                client.on("user-unpublished", (user) => {
                    user.videoTrack?.stop();
                    stopLocalDvrRef.current();
                    backToLiveRef.current();
                    if (!cancelled) {
                        setState("waiting");
                        setMessage("Waiting for camera signal...");
                    }
                });

                client.on("user-left", () => {
                    stopLocalDvrRef.current();
                    backToLiveRef.current();
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

        void joinChannel();

        return () => {
            cancelled = true;

            if (viewerPollIntervalId !== null) {
                window.clearInterval(viewerPollIntervalId);
            }

            const client = clientRef.current;
            clientRef.current = null;
            if (client) {
                clearRemoteTracks(client.remoteUsers);
                client.removeAllListeners();
                client.leave().catch((error) => console.error(error));
            }

            stopClipRecording();
            clearClipPreview();
            stopLocalDvrRef.current();
            backToLiveRef.current();

            if (controlsHideTimerRef.current !== null) {
                window.clearTimeout(controlsHideTimerRef.current);
            }
        };
    }, [feederId, channelName]);

    return (
        <div
            ref={playerRef}
            onMouseMove={revealControls}
            onMouseEnter={revealControls}
            onMouseLeave={hideControlsIfUnfocused}
            onTouchStart={revealControls}
            onFocusCapture={revealControls}
            onBlurCapture={scheduleControlsHide}
            className={`relative overflow-hidden bg-black ${
                isTheaterMode
                    ? "fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-black"
                    : "h-full w-full"
            }`}
        >
            <div className={`relative h-full w-full ${isTheaterMode ? "max-h-screen max-w-screen" : ""}`}>
            <div
                ref={videoRef}
                className="absolute inset-0 h-full w-full [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
            />
            <video
                ref={delayedVideoRef}
                className={`absolute inset-0 h-full w-full bg-black object-cover ${isWatchingDelayed ? "z-10" : "pointer-events-none z-0 opacity-0"}`}
                playsInline
                onTimeUpdate={handleDelayedTimeUpdate}
                onPlay={() => setIsDelayedPlaying(true)}
                onPause={() => setIsDelayedPlaying(false)}
                onEnded={() => setIsDelayedPlaying(false)}
            />
            <div className={`absolute left-4 top-4 z-20 rounded-full px-3 py-1 text-xs font-black tracking-wider text-white backdrop-blur ${
                isWatchingDelayed ? "bg-amber-600" : "bg-red-600"
            }`}>
                {isWatchingDelayed ? "DELAYED" : "LIVE"}
            </div>
            <div className={`absolute right-4 top-4 z-20 rounded-full bg-black/70 px-3 py-1 text-xs font-mono text-white backdrop-blur transition-opacity duration-300 ${
                showControls ? "opacity-100" : "opacity-0"
            }`}>
                <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {viewerCount} watching
                </span>
            </div>
            <div className={`absolute bottom-20 left-4 right-4 z-20 rounded-2xl border-2 border-white/20 bg-black/75 p-3 text-white backdrop-blur transition-all duration-300 ${
                showControls ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
            }`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleDelayedPlayback}
                            disabled={!dvrSupported || dvrBufferedEndSeconds <= dvrBufferStartSeconds}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isDelayedPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                        </button>
                        <button
                            type="button"
                            onClick={backToLive}
                            disabled={!isWatchingDelayed}
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Back to Live
                        </button>
                    </div>
                    <span className="text-[11px] font-mono text-white/70">
                        {dvrSupported ? dvrStatus : dvrStatus}
                    </span>
                </div>
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                    <span className="text-[11px] font-mono text-white/80">{formatDvrTime(dvrBufferStartSeconds)}</span>
                    <input
                        type="range"
                        min={dvrBufferStartSeconds}
                        max={Math.max(dvrBufferStartSeconds, dvrBufferedEndSeconds)}
                        step="0.25"
                        value={Math.min(Math.max(dvrPlayheadSeconds, dvrBufferStartSeconds), Math.max(dvrBufferStartSeconds, dvrBufferedEndSeconds))}
                        disabled={!dvrSupported || dvrBufferedEndSeconds <= dvrBufferStartSeconds}
                        onChange={(event) => seekDvr(Number(event.target.value), false)}
                        className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <span className="text-[11px] font-mono text-white/80">{formatDvrTime(dvrBufferedEndSeconds)}</span>
                </div>
            </div>
            <div className={`absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center gap-2 transition-all duration-300 ${
                showControls ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
            }`}>
                <button
                    type="button"
                    onClick={isRecordingClip ? stopClipRecording : startClipRecording}
                    disabled={state !== "playing"}
                    className={`inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-3 py-2 text-xs font-black uppercase tracking-wider text-white backdrop-blur transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isRecordingClip ? "bg-red-600 hover:bg-red-500" : "bg-black/70 hover:bg-white/15"
                    }`}
                >
                    {isRecordingClip ? <Square className="h-4 w-4 fill-current" /> : <Video className="h-4 w-4" />}
                    {isRecordingClip ? "Stop clip" : "Start clip"}
                </button>
                <button
                    type="button"
                    onClick={() => setIsTheaterMode((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-black/70 px-3 py-2 text-xs font-black uppercase tracking-wider text-white backdrop-blur transition-colors hover:bg-white/15"
                >
                    {isTheaterMode ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                    {isTheaterMode ? "Normal" : "Theater"}
                </button>
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-black/70 px-3 py-2 text-xs font-black uppercase tracking-wider text-white backdrop-blur transition-colors hover:bg-white/15"
                >
                    <Maximize2 className="h-4 w-4" />
                    Fullscreen
                </button>
            </div>
            {(clipPreviewUrl || clipStatus) && (
                <div className={`absolute bottom-40 left-4 right-4 z-30 rounded-2xl border-2 border-white/20 bg-black/85 p-3 text-white shadow-2xl backdrop-blur transition-all duration-300 sm:left-auto sm:w-[360px] ${
                    showControls ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
                }`}>
                    {clipPreviewUrl && (
                        <video src={clipPreviewUrl} controls className="mb-3 aspect-video w-full rounded-xl bg-black" />
                    )}
                    {clipStatus && <p className="mb-3 text-xs font-mono text-white/80">{clipStatus}</p>}
                    {clipPreviewUrl && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={downloadClip}
                                className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-2 py-2 text-[11px] font-black uppercase text-white"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Save to device
                            </button>
                            <button
                                type="button"
                                onClick={clearClipPreview}
                                className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-2 text-[11px] font-black uppercase text-white"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Discard
                            </button>
                        </div>
                    )}
                </div>
            )}
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
        </div>
    );
}
