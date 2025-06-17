/*
 * Copyright (c) 2024 - 2025 Tero Jäntti, Sami Heikkinen
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { isIOS } from "./deviceDetection";

/**
 * Handles fullscreen toggling specifically for iOS devices
 */
export async function toggleIOSFullScreen(): Promise<boolean> {
    // Better iOS fullscreen state tracking
    let isIOSInFullscreen = false;
    const videoElement = document.getElementById(
        "ios-fullscreen-video",
    ) as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
        webkitExitFullscreen?: () => void;
        webkitDisplayingFullscreen?: boolean;
    };

    if (videoElement && videoElement.webkitDisplayingFullscreen) {
        isIOSInFullscreen = true;
    }

    // If we need to exit fullscreen on iOS
    if (isIOSInFullscreen) {
        try {
            // Try WebKit-specific exit method first
            if (
                videoElement &&
                typeof videoElement.webkitExitFullscreen === "function"
            ) {
                videoElement.webkitExitFullscreen();
            }

            // iOS also exits fullscreen when video is paused
            if (videoElement) {
                videoElement.pause();
                videoElement.currentTime = 0;
            }

            // Backup method - try standard approach
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }

            return true;
        } catch (err) {
            console.warn("iOS fullscreen exit failed:", err);
            return false;
        }
    }

    // Create or get the fullscreen video element
    const fullscreenVideo =
        (document.getElementById("ios-fullscreen-video") as HTMLVideoElement & {
            webkitEnterFullscreen?: () => void;
        }) || document.createElement("video");

    if (!fullscreenVideo.id) {
        fullscreenVideo.id = "ios-fullscreen-video";
        fullscreenVideo.playsInline = true;
        fullscreenVideo.setAttribute("playsinline", "playsinline");
        fullscreenVideo.muted = true;
        fullscreenVideo.setAttribute("muted", "muted");
        fullscreenVideo.autoplay = false;
        fullscreenVideo.loop = true;

        // Set an extremely small size
        fullscreenVideo.style.width = "1px";
        fullscreenVideo.style.height = "1px";
        fullscreenVideo.style.position = "absolute";
        fullscreenVideo.style.opacity = "0.01";

        // Simple 1x1 transparent video data URI
        fullscreenVideo.src =
            "data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAAAAG1wNDJtcDQxaXNvbWlzbzIAAAACbWV0YQAAAAAAAAAoaGRscgAAAAxBVkMgQ29kaW5nAAAAQ2NvbHJzAAAAG3VpbnQCAAAAGFFSRwKCPQAAAEAAAAJNAAAAAP9tZGF0AAAAEgEH//4PMkXKj////jA9FbmQ=";

        document.body.appendChild(fullscreenVideo);
    }

    // Enter fullscreen on iOS - ensure video plays first
    try {
        // iOS requires play to happen in direct response to user action
        const playPromise = fullscreenVideo.play();

        await playPromise;

        // Small delay to ensure playback has started
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (typeof fullscreenVideo.webkitEnterFullscreen === "function") {
            fullscreenVideo.webkitEnterFullscreen();
            console.log("Requested iOS fullscreen mode");
            return true;
        }
    } catch (err) {
        console.warn("iOS fullscreen attempt failed:", err);
    }

    return false;
}

/**
 * Toggle between fullscreen and windowed mode
 * Works across different browsers with proper error handling
 */
export async function toggleFullScreen(): Promise<void> {
    // Check if we're on iOS
    if (isIOS) {
        // Use iOS-specific implementation
        const success = await toggleIOSFullScreen();
        if (success) {
            return;
        }
        // Fall through to standard approach if iOS-specific failed
    }

    // Standard approach for non-iOS platforms
    const elem = document.documentElement as HTMLElement & {
        mozRequestFullScreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
    };

    if (document.fullscreenElement) {
        try {
            await document.exitFullscreen();
        } catch (err) {
            if (err instanceof Error) {
                console.error(
                    `Error exiting fullscreen: ${err.message} (${err.name})`,
                );
            }
            return;
        }
    } else {
        try {
            // Try standardized method first
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            }
            // Then vendor prefixes for older browsers
            else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                await elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
        } catch (err: unknown) {
            console.warn(
                "Standard fullscreen failed, falling back to canvas positioning",
                err instanceof Error ? err.message : err,
            );
            // Fallback to canvas positioning method if everything else fails
            const canvas = document.querySelector("canvas");
            if (canvas) {
                canvas.style.position = "fixed";
                canvas.style.top = "0";
                canvas.style.left = "0";
                canvas.style.width = "100%";
                canvas.style.height = "100%";
                canvas.style.zIndex = "1000";
            }
            return;
        }
    }
}

/**
 * Check if the browser supports fullscreen mode
 */
export function isFullscreenSupported(): boolean {
    const doc = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        mozRequestFullScreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
    };

    return !!(
        doc.requestFullscreen ||
        doc.webkitRequestFullscreen ||
        doc.mozRequestFullScreen ||
        doc.msRequestFullscreen
    );
}

/**
 * Check if currently in fullscreen mode
 */
export function isFullscreen(): boolean {
    return !!document.fullscreenElement;
}
