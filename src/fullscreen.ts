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

type WebkitDocument = Document & {
    webkitFullscreenEnabled: boolean;
    webkitfullscreenElement: Element | null;
    webkitExitFullscreen: () => Promise<void>;
};

type WebkitElement = HTMLElement & {
    webkitRequestFullscreen: () => Promise<void>;
};

const isWebkit = (d: Document): d is WebkitDocument =>
    "webkitExitFullscreen" in d;

const isWebkitElement = (e: Element): e is WebkitElement =>
    "webkitRequestFullscreen" in e;

const isFullscreenEnabled =
    document.fullscreenEnabled ||
    (isWebkit(document) && document.webkitFullscreenEnabled);

export const isFullscreen = (): boolean =>
    document.fullscreenElement != null ||
    (isWebkit(document) && document.webkitfullscreenElement != null) ||
    // Check if fullscreen from a browser control (e.g. F11 key).
    (!window.screenTop && !window.screenY);

export const toggleFullScreen = async (): Promise<void> => {
    if (!isFullscreenEnabled) {
        return;
    }

    if (isFullscreen()) {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (isWebkit(document)) {
                await document.webkitExitFullscreen();
            }
        } catch (err) {
            if (err instanceof Error) {
                console.error(
                    `Error exiting fullscreen:${err.message} (${err.name})`,
                );
            }
        }
    } else {
        const elem = document.documentElement;

        try {
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (isWebkitElement(elem)) {
                await elem.webkitRequestFullscreen();
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error(
                    `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
                );
            }
        }
    }
};
