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

/**
 * Fullscreen functionality for the game
 */

/**
 * Toggle between fullscreen and windowed mode
 * Works across different browsers with proper error handling
 */
export async function toggleFullScreen(): Promise<void> {
    const elem = document.documentElement as HTMLElement & {
        mozRequestFullScreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
    };

    if (document.fullscreenElement) {
        try {
            await document.exitFullscreen();
            console.log("Exited fullscreen mode");
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
            console.log("Entered fullscreen mode");
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error(
                    `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
                );
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
