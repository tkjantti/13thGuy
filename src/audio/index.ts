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

// @ts-expect-error Library module
import { zzfx } from "../core/audio/sfxPlayer.js";
import { setupAudioUnlock } from "../core/audio/unlock";
import {
    createTune,
    FadeIn,
    FadeOut,
    FadeOutIn,
    initTune,
    stopTune,
} from "../core/audio/music";

export enum Sound {
    Start = "start",
    Race = "race",
    Bounce = "bounce",
    Hit = "hit",
    Teleport = "teleport",
    Keyboard = "keyboard",
    Finished = "finished",
    GameOver = "gameover",
    Restart = "restart",
    Count = "count",
    Go = "go",
}

const startTune = createTune();
const raceTune = createTune();
const gameoverFx = createTune();

export const initializeAudio = () => {
    setupAudioUnlock(startTune);

    return Promise.all([
        initTune(startTune, song1, true),
        initTune(raceTune, song2, true),
        initTune(gameoverFx, gameoverSfx, false),
    ]);
};

export const playSound = async (
    tune: Sound,
    vol: number = 1,
): Promise<void> => {
    if (vol === 0) return;

    switch (tune) {
        case Sound.Race: {
            raceTune.currentTime = 0;
            FadeOutIn(startTune, raceTune);
            break;
        }
        case Sound.Finished: {
            zzfx(0.04, ...finishSfx);
            startTune.currentTime = 0;
            FadeOutIn(raceTune, startTune);
            break;
        }
        case Sound.GameOver: {
            gameoverFx.volume = 1;
            gameoverFx.play().catch((e) => {
                console.warn("Failed to play gameoverFx:", e);
            });
            FadeOut(raceTune);
            break;
        }
        case Sound.Restart: {
            startTune.currentTime = 0;
            FadeIn(startTune);
            break;
        }
        case Sound.Start: {
            if (startTune.paused || startTune.volume < 1) {
                startTune.currentTime = 0;
                FadeIn(startTune);
            }
            break;
        }
        case Sound.Bounce: {
            zzfx(vol, ...bounceSfx);
            break;
        }
        case Sound.Hit: {
            zzfx(vol, ...hitSfx);
            break;
        }
        case Sound.Keyboard: {
            zzfx(0.5, ...kbSfx);
            break;
        }
        case Sound.Teleport: {
            zzfx(vol, ...teleportSfx);
            break;
        }
        case Sound.Count: {
            zzfx(0.5, ...countSfx);
            break;
        }
        case Sound.Go: {
            zzfx(0.5, ...goSfx);
            break;
        }
    }
};

export const stopAllTunes = (): void => {
    stopTune(startTune);
    stopTune(raceTune);
    stopTune(gameoverFx);
};
