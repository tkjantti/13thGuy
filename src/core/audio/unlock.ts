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
import { zzfxX } from "./sfxPlayer.js";

import { isDesktop, isIPad } from "../platform/deviceDetection";
import { Tune } from "./music";

let audioUnlocked = false;

const unlockAudio = async (tuneToTestWith: Tune): Promise<void> => {
    console.log("Attempting to unlock audio systems...");

    if (audioUnlocked) return;

    // IMPORTANT: Skip unlock only on true desktop browsers, never on iPad
    if (isDesktop && !isIPad) {
        console.log("Skipping audio unlock on desktop browser");
        audioUnlocked = true;
        return;
    }

    console.log("Running audio unlock for mobile/iPad device");

    // Original mobile unlock code continues below
    // 1. Try to unlock HTML Audio elements
    try {
        // Quick play attempt on the tune element
        tuneToTestWith.volume = 0.1;
        await tuneToTestWith
            .play()
            .catch((e) => console.log("First unlock attempt:", e));
        tuneToTestWith.pause();
        tuneToTestWith.currentTime = 0;
        console.log("HTML Audio unlocked successfully");
    } catch (e) {
        console.warn("HTML Audio unlock attempt failed:", e);
    }

    // 2. Make sure zzfx audio context is created and resumed
    try {
        if (zzfxX && zzfxX.state !== "running") {
            await zzfxX.resume();
        }
        console.log("Web Audio API context state for zzfxX:", zzfxX?.state);
    } catch (e) {
        console.warn("Web Audio API context resume failed for zzfxX:", e);
    }

    audioUnlocked = true;
};

/**
 * Attempts to unlock audio upon first click or touch.
 */
export const setupAudioUnlock = (tuneToTestWith: Tune): void => {
    // Skip ONLY on true desktop browsers, never on iPad
    if (isDesktop && !isIPad) {
        console.log("Skipping audio unlock setup on desktop browser");
        audioUnlocked = true;
        return;
    }

    console.log("Setting up audio unlock for mobile/iPad device");

    // Create a silent audio element as backup method
    const silentAudio = document.createElement("audio");
    silentAudio.setAttribute(
        "src",
        "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//tUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABGwD///////////////////////////////////////////8AAAA8TEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAARvMPHBz//////////////////////////////////////////////////////////////////8AAAA",
    );
    silentAudio.setAttribute("playsinline", "playsinline");
    silentAudio.volume = 0.1; // Higher volume to ensure it registers

    // Function to attempt unlocking audio
    const attemptUnlock = async () => {
        console.log("Attempting to unlock audio systems from event handler");

        // 1. Try to play the silent sound
        try {
            silentAudio
                .play()
                .catch((e) => console.log("Silent audio error:", e));
        } catch (e) {
            console.log("Silent audio exception:", e);
        }

        // 2. Call our comprehensive unlockAudio function
        try {
            await unlockAudio(tuneToTestWith);
        } catch (e) {
            console.log("sfx unlockAudio error:", e);
        }

        // Remove event listeners after attempting unlock
        document.removeEventListener("touchstart", attemptUnlock, true);
        document.removeEventListener("touchend", attemptUnlock, true);
        document.removeEventListener("click", attemptUnlock, true);
    };

    // Add listeners in capture phase to handle them first
    document.addEventListener("touchstart", attemptUnlock, {
        once: true,
        capture: true,
    });
    document.addEventListener("touchend", attemptUnlock, {
        once: true,
        capture: true,
    });
    document.addEventListener("click", attemptUnlock, {
        once: true,
        capture: true,
    });
};
