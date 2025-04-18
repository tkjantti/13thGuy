/*
 * Copyright (c) 2024 Tero Jäntti, Sami Heikkinen
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
    goSfx
} from "./sfxData.js";

import { zzfx } from "./sfxPlayer.js"
import CPlayer from "./musicplayer.js";

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

const startTune = document.createElement("audio");
const raceTune = document.createElement("audio");
const gameoverFx = document.createElement("audio");

export const initMusicPlayer = (audioTrack, tune, isLooped) => {
    return new Promise((resolve) => {
        var songplayer = new CPlayer();
        // Initialize music generation (player).
        songplayer.init(tune);
        // Generate music...
        var done = false;
        setInterval(function () {
            if (done) {
                return;
            }
            done = songplayer.generate() >= 1;
            if (done) {
                // Put the generated song in an Audio element.
                var wave = songplayer.createWave();
                audioTrack.src = URL.createObjectURL(
                    new Blob([wave], { type: "audio/wav" }),
                );
                audioTrack.loop = isLooped;
                resolve();
            }
        }, 0);
    });
};

export const initialize = () => {
    return Promise.all([
        initMusicPlayer(startTune, song1, true),
        initMusicPlayer(raceTune, song2, true),
        initMusicPlayer(gameoverFx, gameoverSfx, false),
    ]);
};

const FadeOut = (tune, vol = 0) => {
    var currentVolume = tune.volume;
    if (tune.volume > vol) {
        var fadeOutInterval = setInterval(function () {
            currentVolume = (parseFloat(currentVolume) - 0.1).toFixed(1);
            if (currentVolume > vol) {
                tune.volume = currentVolume;
            } else {
                tune.volume = vol;
                if (vol === 0) tune.pause();
                clearInterval(fadeOutInterval);
            }
        }, 100);
    }
};

const FadeIn = (tune, vol = 1) => {
    setTimeout(() => {
        tune.play();
        var currentVolume = tune.volume;
        if (tune.volume < vol) {
            var fadeOutInterval = setInterval(function () {
                currentVolume = (parseFloat(currentVolume) + 0.1).toFixed(1);
                if (currentVolume < vol) {
                    tune.volume = currentVolume;
                } else {
                    tune.volume = vol;
                    clearInterval(fadeOutInterval);
                }
            }, 100);
        }
    }, 200);
};

const FadeOutIn = (tune1, tune2) => {
    var currentVolume = tune1.volume;
    var fadeOutInterval1 = setInterval(function () {
        currentVolume = (parseFloat(currentVolume) - 0.1).toFixed(1);
        if (currentVolume > 0) {
            tune1.volume = currentVolume;
        } else {
            tune1.volume = 0;
            tune1.pause();
            clearInterval(fadeOutInterval1);

            setTimeout(() => {
                FadeIn(tune2, 1);
            }, 500);
        }
    }, 100);
};

export const playTune = (tune, vol) => {
    if (vol === 0) return

    switch (tune) {
        case SFX_RACE: {
            raceTune.currentTime = 0;
            FadeOutIn(startTune, raceTune);
            break;
        }
        case SFX_FINISHED: {
            zzfx(0.04,...finishSfx);
            startTune.currentTime = 0;
            FadeOutIn(raceTune, startTune);
            break;
        }
        case SFX_GAMEOVER: {
            gameoverFx.volume = 1;
            gameoverFx.play();
            FadeOut(raceTune);
            break;
        }
        case SFX_RESTART: {
            startTune.currentTime = 0;
            FadeIn(startTune);
            break;
        }
        case SFX_START: {
            startTune.volume = 0;
            startTune.currentTime = 0;
            raceTune.currentTime = 0;
            var promise = startTune.play();
            if (promise !== undefined) {
                promise
                    .then(() => {
                        // Autoplay started!
                    })
                    .catch((error) => {
                        console.log("No for autoplay!" + error);
                        // Autoplay was prevented.
                    });
            }
            FadeIn(startTune);
            break;
        }
        //SFX
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
            zzfx(vol,...teleportSfx);
            break;
        }
        case SFX_COUNT: {
            zzfx(0.5, ...countSfx);
            break;
        }
        case SFX_GO: {
            zzfx(0.5,...goSfx);
            break;
        }
    }
};

export const stopTune = (tune) => {
    switch (tune) {
        case SFX_RACE: {
            FadeOut(raceTune);
            break;
        }
        case SFX_START: {
            FadeOut(startTune);
            break;
        }
    }
};
