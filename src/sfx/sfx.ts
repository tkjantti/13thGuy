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

import {
    song1,
    song2,
    bounceSfx,
    hitSfx,
    kbSfx,
    finishSfx,
    gameoverSfx,
    teleportSfx,
    countSfx,
    goSfx,
    // @ts-expect-error JS code exported by a tool
} from "./sfxData.js";

import { isIPad, isDesktop } from "../core/platform/deviceDetection";

// @ts-expect-error Library module
import { zzfx, zzfxX } from "./sfxPlayer.js";
import {
    createTune,
    FadeIn,
    FadeOut,
    FadeOutIn,
    initMusicPlayer,
    Tune,
} from "./music";

export const SFX_START = "start";
export const SFX_RACE = "race";
export const SFX_BOUNCE = "bounce";
export const SFX_HIT = "hit";
export const SFX_TELEPORT = "teleport";
export const SFX_KB = "keyboard";
export const SFX_FINISHED = "finished";
export const SFX_GAMEOVER = "gameover";
export const SFX_RESTART = "restart";
export const SFX_COUNT = "count";
export const SFX_GO = "go";

const startTune = createTune();
const raceTune = createTune();
const gameoverFx = createTune();

export let audioUnlocked = false;

// Update the unlockAudio function
export const unlockAudio = async (): Promise<void> => {
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
        // Quick play attempt on the startTune element
        startTune.volume = 0.1;
        await startTune
            .play()
            .catch((e) => console.log("First unlock attempt:", e));
        startTune.pause();
        startTune.currentTime = 0;
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

// Update the setupAudioUnlock function
export const setupAudioUnlock = (): void => {
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
            await unlockAudio();
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

export const initialize = () => {
    // Set up audio unlock automatically
    setupAudioUnlock();

    return Promise.all([
        initMusicPlayer(startTune, song1, true),
        initMusicPlayer(raceTune, song2, true),
        initMusicPlayer(gameoverFx, gameoverSfx, false),
    ]);
};

export const playTune = async (
    tune: string,
    vol: number = 1,
): Promise<void> => {
    if (vol === 0) return;

    switch (tune) {
        case SFX_RACE: {
            raceTune.currentTime = 0;
            FadeOutIn(startTune, raceTune);
            break;
        }
        case SFX_FINISHED: {
            zzfx(0.04, ...finishSfx);
            startTune.currentTime = 0;
            FadeOutIn(raceTune, startTune);
            break;
        }
        case SFX_GAMEOVER: {
            gameoverFx.volume = 1;
            gameoverFx.play().catch((e) => {
                console.warn("Failed to play gameoverFx:", e);
            });
            FadeOut(raceTune);
            break;
        }
        case SFX_RESTART: {
            startTune.currentTime = 0;
            FadeIn(startTune);
            break;
        }
        case SFX_START: {
            if (startTune.paused || startTune.volume < 1) {
                startTune.currentTime = 0;
                FadeIn(startTune);
            }
            break;
        }
        case SFX_BOUNCE: {
            zzfx(vol, ...bounceSfx);
            break;
        }
        case SFX_HIT: {
            zzfx(vol, ...hitSfx);
            break;
        }
        case SFX_KB: {
            zzfx(0.5, ...kbSfx);
            break;
        }
        case SFX_TELEPORT: {
            zzfx(vol, ...teleportSfx);
            break;
        }
        case SFX_COUNT: {
            zzfx(0.5, ...countSfx);
            break;
        }
        case SFX_GO: {
            zzfx(0.5, ...goSfx);
            break;
        }
    }
};

export const stopTune = (tune?: string): void => {
    const tunesToStop: Tune[] = [];

    if (tune === SFX_RACE) {
        tunesToStop.push(raceTune);
    } else if (tune === SFX_START) {
        tunesToStop.push(startTune);
    } else {
        tunesToStop.push(startTune, raceTune, gameoverFx);
    }

    tunesToStop.forEach((audioEl) => {
        if (audioEl._fadeInterval) {
            clearInterval(audioEl._fadeInterval);
            audioEl._fadeInterval = undefined;
        }
        if (audioEl._fadeOutInTimeout) {
            clearTimeout(audioEl._fadeOutInTimeout);
            audioEl._fadeOutInTimeout = undefined;
        }

        audioEl.pause();
        audioEl.currentTime = 0;
    });
};
