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

// @ts-expect-error Library module
import CPlayer from "./musicplayer.js";
import { isIOS } from "../core/platform/deviceDetection";

export interface Tune extends HTMLAudioElement {
    _fadeInterval?: number;
    _fadeOutInTimeout?: number;
}

export const createTune = (): Tune => document.createElement("audio") as Tune;

export const initMusicPlayer = (
    audioTrack: Tune,
    tune: unknown,
    isLooped: boolean,
): Promise<void> => {
    return new Promise((resolve) => {
        const songplayer = new CPlayer();
        // Initialize music generation (player).
        songplayer.init(tune);
        // Generate music...
        let done = false;
        setInterval(function () {
            if (done) {
                return;
            }
            done = songplayer.generate() >= 1;
            if (done) {
                // Put the generated song in an Audio element.
                const wave = songplayer.createWave();
                audioTrack.src = URL.createObjectURL(
                    new Blob([wave], { type: "audio/wav" }),
                );
                audioTrack.loop = isLooped;
                resolve();
            }
        }, 0);
    });
};

const roundToFractionDigits = (x: number, fractionDigits: number): number =>
    parseFloat(x.toFixed(fractionDigits));

export const FadeOut = (tune: Tune, vol = 0): void => {
    if (tune._fadeInterval) {
        clearInterval(tune._fadeInterval);
        tune._fadeInterval = undefined;
    }
    let currentVolume = tune.volume;
    if (currentVolume > vol) {
        tune._fadeInterval = setInterval(function () {
            currentVolume = roundToFractionDigits(
                Math.max(vol, currentVolume - 0.1),
                1,
            );
            tune.volume = currentVolume;
            if (currentVolume <= vol) {
                if (vol === 0) tune.pause();
                clearInterval(tune._fadeInterval);
                tune._fadeInterval = undefined;
            }
        }, 100);
    } else if (vol === 0 && !tune.paused) {
        tune.pause();
        tune.volume = 0;
    }
};

export const FadeIn = (tune: Tune, vol: number = 1): void => {
    if (tune._fadeInterval) {
        clearInterval(tune._fadeInterval);
        tune._fadeInterval = undefined;
    }

    let playPromise = Promise.resolve();
    if (tune.paused) {
        // Key change: Start with a small audible volume on iOS
        tune.volume = isIOS ? 0.1 : 0;

        // Add playsinline for iOS (just to be safe)
        tune.setAttribute("playsinline", "playsinline");
        playPromise = tune.play();
    }

    playPromise
        .then(() => {
            // Start from current volume
            let currentVolume = tune.volume;

            if (currentVolume < vol) {
                if (tune._fadeInterval) clearInterval(tune._fadeInterval);

                tune._fadeInterval = setInterval(function () {
                    currentVolume = roundToFractionDigits(
                        Math.min(vol, currentVolume + 0.1),
                        1,
                    );
                    tune.volume = currentVolume;

                    if (currentVolume >= vol) {
                        tune.volume = vol;
                        clearInterval(tune._fadeInterval);
                        tune._fadeInterval = undefined;
                    }
                }, 100);
            } else {
                tune.volume = vol;
            }
        })
        .catch((e) => {
            console.warn("FadeIn play() failed:", e);
            // Try one more time with higher volume on any failure
            if (tune.paused) {
                tune.volume = 1;
                tune.play().catch((err) =>
                    console.error("Second play attempt failed:", err),
                );
            }

            if (tune._fadeInterval) {
                clearInterval(tune._fadeInterval);
                tune._fadeInterval = undefined;
            }
        });
};

export const FadeOutIn = (tune1: Tune, tune2: Tune): void => {
    if (tune1._fadeInterval) clearInterval(tune1._fadeInterval);
    if (tune1._fadeOutInTimeout) clearTimeout(tune1._fadeOutInTimeout);
    if (tune2._fadeInterval) clearInterval(tune2._fadeInterval);
    if (tune2._fadeOutInTimeout) clearTimeout(tune2._fadeOutInTimeout);
    tune1._fadeInterval = undefined;
    tune1._fadeOutInTimeout = undefined;
    tune2._fadeInterval = undefined;
    tune2._fadeOutInTimeout = undefined;

    let currentVolume = tune1.volume;
    if (currentVolume > 0) {
        tune1._fadeInterval = setInterval(function () {
            currentVolume = roundToFractionDigits(
                Math.max(0, currentVolume - 0.1),
                1,
            );
            tune1.volume = currentVolume;

            if (currentVolume <= 0.1) {
                tune1.pause();
                clearInterval(tune1._fadeInterval);
                tune1._fadeInterval = undefined;

                tune1._fadeOutInTimeout = setTimeout(() => {
                    FadeIn(tune2, 1);
                    tune1._fadeOutInTimeout = undefined;
                }, 500);
            }
        }, 100);
    } else {
        tune1.pause();
        tune1.volume = 0;
        tune1._fadeOutInTimeout = setTimeout(() => {
            FadeIn(tune2, 1);
            tune1._fadeOutInTimeout = undefined;
        }, 500);
    }
};
