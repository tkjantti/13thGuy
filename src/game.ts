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
    applyCRTEffect,
    applyGradient,
    applyGrayscale,
    canvas,
    cx,
    createFabricTexture,
    createPlateTexture,
} from "./graphics";
import { renderText, TextSize } from "./text";
import { sleep } from "./keyboard";
import { Level, State } from "./Level";
import { getFirstTrack, getSecondTrack, getThirdTrack } from "./tracks";

import {
    initialize,
    playTune,
    stopTune,
    SFX_START,
    SFX_RACE,
    SFX_FINISHED,
    SFX_GAMEOVER,
    SFX_RESTART,
    SFX_COUNT,
    SFX_GO,
    // Ignore lint errors from JS import
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
} from "./sfx/sfx.js";
import {
    CharacterAnimation,
    CharacterFacingDirection,
    clearCharacterGradientCache,
    renderCharacter,
} from "./CharacterAnimation";
import { playerColor } from "./Character";
import { VERSION } from "./version";
import {
    initializeControls,
    renderTouchControls,
    renderWaitForProgressInput,
    updateControls,
    waitForProgressInput,
} from "./controls";
import { hasTouchScreen } from "./touchscreen";

// Declare playTune on the global scope for the iOS audio unlock workaround
declare global {
    // eslint-disable-next-line no-var
    var playTune: (soundId: number) => void;
}

// Simple iOS audio unlock function
function unlockAudioForIOS() {
    // Create a silent audio element
    const silentAudio = document.createElement("audio");
    silentAudio.setAttribute(
        "src",
        "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//tUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABGwD///////////////////////////////////////////8AAAA8TEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAARvMPHBz//////////////////////////////////////////////////////////////////8AAAA",
    );
    silentAudio.setAttribute("playsinline", "playsinline");
    silentAudio.volume = 0.001; // ultra low volume

    // Function to play the silent sound and unlock audio
    const unlockAudio = () => {
        silentAudio
            .play()
            .then(() => {
                console.log("Audio unlocked for iOS");

                // Play the start sound after unlocking audio
                playTune(SFX_START); // Use playTune instead of stopTune

                // Remove event listeners
                document.removeEventListener("touchstart", unlockAudio);
                document.removeEventListener("touchend", unlockAudio);
                document.removeEventListener("click", unlockAudio);
            })
            .catch((error) => {
                console.error("Failed to unlock audio:", error);
            });
    };

    // Add event listeners for user interaction
    document.addEventListener("touchstart", unlockAudio, false);
    document.addEventListener("touchend", unlockAudio, false);
    document.addEventListener("click", unlockAudio, false);

    // Return the unlock function for direct calling
    return unlockAudio;
}

// Check for iOS and initialize audio unlock if needed
function initIOSAudio() {
    const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOS) {
        console.log("iOS device detected, initializing audio unlock");
        unlockAudioForIOS();

        // Intercept the first SFX_START playback attempt to avoid silent playback
        // Replace the imported playTune function with our wrapper
        // We need to use the same scope, not window object
        (function () {
            // Save reference to the original imported function
            const original = playTune;

            // Override the imported function
            globalThis.playTune = function (soundId) {
                if (soundId === SFX_START) {
                    // First call will be skipped, the unlockAudio function will play it instead
                    globalThis.playTune = original;
                    return;
                }
                return original(soundId);
            };
        })();
    }
}

// Call this function immediately
initIOSAudio();

const versionText = "Director's cut (" + (VERSION ? VERSION : "DEV") + ")";

const TIME_STEP = 1000 / 60;
const MAX_FRAME = TIME_STEP * 5;

let lastTime = performance.now();

let raceNumber = 0;

// Randomize player character
let randomWidhOffset = 1 + Math.random() * 0.6;
let randomHeighOffset = 1 + Math.random() * 0.3;

// Player zoom level for animation
let z = 1;

let level: Level | undefined; // Explicitly allow undefined

let maxRadius = 0;

enum GameState {
    Load,
    Init,
    Start,
    Wait,
    RaceStarting,
    Ready,
    Running,
    GameOver,
    GameFinished,
}

let gameState: GameState = GameState.Load;

// Hold the time of drawing for functions where the t variable is not
// available.
let drawTime: number = 0;

// For drawing start- and game over screens.
const READY_CIRCLE_DURATION = 5000;
let radius = 0;
let readyCircleStartTime = 0;

const pattern = createFabricTexture();
const platePattern = createPlateTexture();

let counted = 0;

const fullscreenButton = document.createElement("button");
const restartButton = document.createElement("button");
const startButton = document.createElement("button");
const START_BUTTON_ID = "startButton";

const setState = async (state: GameState) => {
    gameState = state;

    const restartButton = document.getElementById("restartButton");
    if (restartButton) {
        restartButton.style.display =
            state !== GameState.Init ? "block" : "none";
    }

    const fullscreenButton = document.getElementById("fullscreenButton");
    if (fullscreenButton) {
        fullscreenButton.style.display =
            state !== GameState.Init || !hasTouchScreen ? "block" : "none";
    }

    maxRadius = 1280 * 2;

    switch (state) {
        case GameState.Start:
            // SFX_START or SFX_RESTART is playing
            await sleep(0);
            await waitForProgressInput(); // Now wait for a genuinely new input
            setState(GameState.Wait);
            break;
        case GameState.Wait:
            // SFX_START continues playing.
            await waitForProgressInput();
            setState(GameState.RaceStarting);
            break;
        case GameState.RaceStarting:
            // SFX_START continues playing
            setState(GameState.Ready);
            break;
        case GameState.Ready:
            counted = 0; // Ensure counted is 0 when entering Ready
            stopTune(); // Stop previous tune (SFX_START)
            // Create new level instance
            if (raceNumber > 1 && level && !level.player.eliminated) {
                const track =
                    raceNumber === 3 ? getThirdTrack() : getSecondTrack();
                level = new Level(
                    track,
                    randomWidhOffset,
                    randomHeighOffset,
                    level.characters, // Pass existing characters for subsequent rounds
                    platePattern,
                );
            } else {
                // First race or after elimination, start fresh
                level = new Level(
                    getFirstTrack(),
                    randomWidhOffset,
                    randomHeighOffset,
                    undefined, // Start with default characters
                    platePattern,
                );
            }
            radius = maxRadius; // Reset radius for the animation
            readyCircleStartTime = drawTime;
            playTune(SFX_RACE); // Play race tune *only* here
            break;

        case GameState.GameOver:
            radius = 1;
            playTune(SFX_GAMEOVER); // Play game over tune
            randomWidhOffset = 1 + Math.random() * 0.6;
            randomHeighOffset = 1 + Math.random() * 0.3;

            await waitForProgressInput(); // Wait for continue input
            raceNumber = 1;
            playTune(SFX_RESTART); // Play restart tune *after* input
            setState(GameState.Start);
            break;
        case GameState.GameFinished:
            radius = 1;
            playTune(SFX_FINISHED); // Play finished tune
            if (level && level.characters.length > 14) {
                // Qualified
                await sleep(2500); // Let tune play during wait
                await waitForProgressInput();
                raceNumber++; // Increment race number for the next round
                setState(GameState.Ready);
            } else {
                // Final Winner
                await waitForProgressInput(); // Wait for input to restart
                raceNumber = 1;
                clearCharacterGradientCache();
                playTune(SFX_RESTART); // Play restart tune *after* input
                setState(GameState.Start);
            }
            break;
        case GameState.Running:
            renderTouchControls();
            break;
        case GameState.Init:
            stopTune();
            break;
        default:
            break;
    }
};

const gameLoop = (t: number): void => {
    requestAnimationFrame(gameLoop);

    const deltaTime = t - lastTime;

    if (deltaTime >= TIME_STEP) {
        const cappedDeltaTime = Math.min(deltaTime, MAX_FRAME);
        lastTime = t - (deltaTime % TIME_STEP);

        update(t, cappedDeltaTime);
        draw(t, cappedDeltaTime);
    }
};

const update = (t: number, dt: number): void => {
    switch (gameState) {
        case GameState.Running: {
            updateControls();
            level?.update(t, dt);
            if (level?.state === State.GAME_OVER) {
                setState(GameState.GameOver);
            } else if (level?.state === State.FINISHED) {
                setState(GameState.GameFinished);
            }
            break;
        }
        case GameState.Ready: {
            if (counted === 2 && radius < maxRadius / 4) {
                playTune(SFX_GO);
                counted++;
            } else if (counted === 1 && radius < maxRadius / 2) {
                playTune(SFX_COUNT);
                counted++;
            } else if (counted === 0 && radius < maxRadius) {
                playTune(SFX_COUNT);
                counted++;
            }
            break;
        }
        default: {
            break;
        }
    }
};

let textAnimationCounter = 0;
const loadingText = "LOADING...";

export const renderLoadingText = (): void => {
    const text =
        textAnimationCounter < 10
            ? loadingText.substring(0, textAnimationCounter)
            : "LOADING...";

    renderText(
        text + (textAnimationCounter++ % 60 === 0 ? "" : "█"),
        TextSize.Small,
        "Courier New",
        1,
        7.7,
        true,
        0,
        loadingText,
    );
};

const draw = (t: number, dt: number): void => {
    drawTime = t;
    cx.save();
    cx.fillStyle = "rgb(0, 0, 20)";
    cx.fillRect(0, 0, canvas.width, canvas.height);
    level?.draw(t, dt);
    cx.restore();

    cx.save();

    switch (gameState) {
        case GameState.Load: {
            renderLoadingText();
            textAnimationCounter++;
            applyGrayscale();
            applyCRTEffect(false);

            break;
        }
        case GameState.Init: {
            drawInitialScreen(true); // Draw background/character/logo

            if (hasTouchScreen) {
                // TOUCH DEVICE: Show full screen start button
                const btn = document.getElementById(START_BUTTON_ID);
                if (btn && btn.style.display === "none") {
                    btn.style.display = "block";
                }
            } else {
                // NON-TOUCH DEVICE
                renderWaitForProgressInput("start");
            }

            break;
        }
        case GameState.Start: {
            drawStartScreen(t++, false, 0);
            applyGradient();
            applyCRTEffect(true);

            break;
        }
        case GameState.Wait: {
            drawStartScreen(t++, true, (z = z + 0.01));
            applyGradient();
            applyCRTEffect(true);

            break;
        }
        case GameState.RaceStarting: {
            drawStartScreen(t++, true, (z = z + 0.01));

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            cx.beginPath();
            cx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            cx.fillStyle = "#802010";
            cx.fill();

            if (radius < maxRadius) {
                radius += dt;
            }
            applyGradient();
            applyCRTEffect(true);

            break;
        }
        case GameState.Ready: {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            if (radius <= 0) {
                setState(GameState.Running);
            } else {
                if (radius > 0) {
                    cx.beginPath();
                    cx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                    cx.fillStyle =
                        radius < maxRadius / 4
                            ? "#105000"
                            : radius < maxRadius / 2
                              ? "#CCCC40"
                              : "#802010";
                    cx.fill();
                }
                if (radius < maxRadius / 4) {
                    renderText(
                        "▲ GO! ▲",
                        TextSize.Xl,
                        "Impact",
                        (radius / maxRadius) * 4,
                    );
                } else if (radius < maxRadius / 2) {
                    renderText("Set...", TextSize.Xl, "Impact", 1);
                } else {
                    renderText("Ready...", TextSize.Xl, "Impact", 1);
                }

                if (radius > 0) {
                    const progress =
                        (t - readyCircleStartTime) / READY_CIRCLE_DURATION;
                    radius = (1 - progress) * maxRadius;
                }
            }
            applyGradient();
            applyCRTEffect(true);

            break;
        }
        case GameState.GameOver: {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            cx.beginPath();
            cx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            cx.fillStyle = "#802010";
            cx.fill();
            renderText("❌ ELIMINATED!", TextSize.Large, "Impact", 1, -4.5);
            if (level?.player.rank === 13) {
                renderText(
                    "Don't be the 13TH GUY",
                    TextSize.Small,
                    "Sans-serif",
                );
            } else {
                renderText(
                    "Don't be one of the last 13TH GUYs",
                    TextSize.Small,
                    "Sans-serif",
                );
                renderText(
                    "The final rank is " + level?.player.rank + ".",
                    TextSize.Normal,
                    "Impact",
                    1,
                    3.1,
                );
            }
            if (radius >= maxRadius) {
                renderWaitForProgressInput("continue", 9);
            }

            if (radius < maxRadius) {
                cx.save();
                cx.globalAlpha = 0.7;
                cx.translate(canvas.width / 8, radius * 2 - canvas.height);
                renderCharacter(
                    cx,
                    "eliminated",
                    (canvas.height / 6) * randomWidhOffset,
                    (canvas.height / 2) * randomHeighOffset,
                    t,
                    CharacterFacingDirection.Backward,
                    CharacterAnimation.Fall,
                    pattern,
                );
                cx.globalAlpha = 0;
                cx.restore();
            }
            if (radius < maxRadius) {
                radius += dt;
            }

            applyGradient();
            applyCRTEffect(true);

            break;
        }
        case GameState.GameFinished: {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            cx.beginPath();
            cx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            cx.fillStyle = "#105000";
            cx.fill();

            if (radius >= maxRadius / 4) {
                if (level && level.characters.length > 14) {
                    renderText("✪ QUALIFIED!", TextSize.Large, "Impact", 1, -5);
                    renderText("☻", TextSize.Huge, "Impact");
                    renderText(
                        "Ready for next round " + (raceNumber + 1) + " / 3",
                        TextSize.Normal,
                        "Sans-serif",
                        1,
                        3.8,
                    );
                } else {
                    renderText(
                        "GAME FINISHED!",
                        TextSize.Large,
                        "Impact",
                        1,
                        -5,
                    );
                    renderText("☻", TextSize.Huge, "Impact");
                    renderText(
                        "Congratulations to the winner!",
                        TextSize.Normal,
                        "Impact",
                        1,
                        3.8,
                    );
                }

                if (radius >= maxRadius) {
                    renderWaitForProgressInput();
                }

                cx.save();
                cx.translate(
                    radius < canvas.width / 6 ? radius : canvas.width / 6,
                    canvas.height / 3,
                );
                renderCharacter(
                    cx,
                    playerColor,
                    (canvas.height / 6) * randomWidhOffset,
                    (canvas.height / 2) * randomHeighOffset,
                    t,
                    radius < canvas.width / 6
                        ? CharacterFacingDirection.Right
                        : (level && level.characters.length <= 14) ||
                            t % 3600 > 1800
                          ? CharacterFacingDirection.Backward
                          : CharacterFacingDirection.BackwardRight,
                    level && level.characters.length > 14
                        ? CharacterAnimation.Walk
                        : CharacterAnimation.Celebrate,
                    pattern,
                );
                cx.restore();
            }

            if (radius < maxRadius) {
                radius += dt;
            }
            applyGradient();
            applyCRTEffect(true);

            break;
        }
        default: {
            // Ensure start button is hidden if we leave Init state
            const btn = document.getElementById(START_BUTTON_ID);
            if (btn && btn.style.display !== "none") {
                btn.style.display = "none";
            }
            applyCRTEffect(false);
            renderTouchControls();

            break;
        }
    }

    cx.restore();
};

const Logo = () => {
    renderText(versionText, TextSize.Tiny, "Impact", 0.5, 2.3, false);

    renderText("Don't be the", TextSize.Small, "Impact", 1, -1.8, true, -0.9);
    renderText("❌ 13TH GUY", TextSize.Xl, "Impact", 1, 1.8);
};

const drawStartScreen = (t: number, wait: boolean, z: number): void => {
    cx.save();
    cx.fillStyle = "rgb(20, 20, 50)";
    cx.rect(0, 0, canvas.width, canvas.height);
    cx.fill();

    cx.save();
    cx.translate(canvas.width / 8 + z, canvas.height / 3);

    renderCharacter(
        cx,
        playerColor,
        (wait ? canvas.height / 6 / z : canvas.height / 6) * randomWidhOffset,
        (wait ? canvas.height / 2 / z : canvas.height / 2) * randomHeighOffset,
        t,
        wait
            ? CharacterFacingDirection.Forward
            : t % 3600 < 1800
              ? CharacterFacingDirection.BackwardRight
              : CharacterFacingDirection.Backward,
        CharacterAnimation.Walk,
        pattern,
        wait,
    );
    cx.restore();

    if (wait) {
        renderText(
            "Avoid being the 13th or among the last 13",
            TextSize.Small,
            "Sans-serif",
            1,
            -1.2,
        );
        renderText(
            "or you will be eventually ❌ eliminated!",
            TextSize.Small,
            "Sans-serif",
            1,
            1.3,
        );
        renderText("MOVE WITH", TextSize.Xs, "Sans-serif", 0.8, -7.5);
        renderText(
            "▲ / W - ▼ / S - ◄ / A - ► / D",
            TextSize.Xs,
            "Sans-serif",
            0.8,
            -5.6,
        );

        if (gameState === GameState.Wait) {
            renderWaitForProgressInput("start the race!");
        }
    } else {
        Logo();
        renderWaitForProgressInput();
    }

    cx.restore();
};

const drawInitialScreen = (noisy: boolean): void => {
    cx.save();
    cx.fillStyle = "rgb(20, 20, 50)";
    cx.rect(0, 0, canvas.width, canvas.height);
    cx.fill();
    cx.save();
    cx.translate(canvas.width / 8, canvas.height / 3);
    renderCharacter(
        cx,
        playerColor,
        (canvas.height / 6) * randomWidhOffset,
        (canvas.height / 2) * randomHeighOffset,
        0,
        CharacterFacingDirection.Backward,
        CharacterAnimation.Stand,
        pattern,
    );
    cx.restore();
    Logo();
    cx.filter = "";
    applyGrayscale();
    applyGradient();
    applyCRTEffect(noisy);
};

// Helper function for the actions right after Init screen interaction
async function postInitActions() {
    // Remove the start button once the game starts
    const btn = document.getElementById(START_BUTTON_ID);
    if (btn) {
        btn.style.display = "none";
    }

    playTune(SFX_START);
    raceNumber = 1;
    setState(GameState.Start);
}

// Function to request fullscreen and exit fullscreen
async function toggleFullScreen(): Promise<void> {
    const elem = document.documentElement as HTMLElement & {
        mozRequestFullScreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
    };

    const fullscreenButton = document.getElementById("fullscreenButton");

    if (document.fullscreenElement) {
        try {
            await document.exitFullscreen();
            if (fullscreenButton) {
                fullscreenButton.textContent = "⛶";
            }
        } catch (err) {
            if (err instanceof Error) {
                console.error(
                    `Error exiting fullscreen:${err.message} (${err.name})`,
                );

                return;
            }
        }
    } else {
        try {
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                await elem.mozRequestFullScreen();
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error(
                    `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
                );

                return;
            }
        }

        if (fullscreenButton) {
            fullscreenButton.textContent = "╬";
        }
    }
}

export const init = async (): Promise<void> => {
    // Make sure the canvas can can be focused
    canvas.tabIndex = 0;
    canvas.style.outline = "none"; // Prevents outline when focused

    // --- Initial Setup ---
    initializeControls();
    lastTime = performance.now();
    window.requestAnimationFrame(gameLoop);

    // --- Button Styles ---
    const top = "10px";
    const zIndex = "10";
    const size = "40px";
    const color = "white";
    const background = "black";
    const border = "1px solid white";
    const borderRadius = "4px";
    const fontSize = "24px";
    const lineHeight = "0";

    // --- Configure Buttons ---
    fullscreenButton.id = "fullscreenButton";
    fullscreenButton.style.position = "absolute";
    fullscreenButton.style.top = top;
    fullscreenButton.style.right = "10px";
    fullscreenButton.style.zIndex = zIndex;
    fullscreenButton.textContent = "⛶";
    startButton.style.fontFamily = "Impact";
    fullscreenButton.style.width = size;
    fullscreenButton.style.height = size;
    fullscreenButton.style.color = color;
    fullscreenButton.style.background = background;
    fullscreenButton.style.border = border;
    fullscreenButton.style.borderRadius = borderRadius;
    fullscreenButton.style.fontSize = fontSize;
    fullscreenButton.style.lineHeight = lineHeight;
    fullscreenButton.style.display = hasTouchScreen ? "none" : "block";

    restartButton.id = "restartButton";
    restartButton.style.position = "absolute";
    restartButton.style.top = top;
    restartButton.style.right = "60px";
    restartButton.style.zIndex = zIndex;
    restartButton.textContent = "↺";
    startButton.style.fontFamily = "Impact";
    restartButton.style.width = size;
    restartButton.style.height = size;
    restartButton.style.color = color;
    restartButton.style.background = background;
    restartButton.style.border = border;
    restartButton.style.borderRadius = borderRadius;
    restartButton.style.fontSize = fontSize;
    restartButton.style.lineHeight = lineHeight;
    restartButton.style.display = "none";

    startButton.id = START_BUTTON_ID;
    startButton.style.position = "absolute";
    startButton.textContent = "Tap the screen to continue█";
    startButton.style.padding = "20vw 0 0 0";
    startButton.style.fontFamily = "Courier New";
    startButton.style.background = "transparent";
    startButton.style.border = "none";
    startButton.style.fontSize = "2vw";
    startButton.style.top = "0";
    startButton.style.bottom = "0";
    startButton.style.left = "0";
    startButton.style.right = "0";
    startButton.style.zIndex = zIndex;
    startButton.style.color = color;
    startButton.style.display = "none";

    // --- Add Buttons to DOM ---
    document.body.appendChild(restartButton);
    document.body.appendChild(fullscreenButton);
    document.body.appendChild(startButton);

    // --- Add Event Listeners ---
    fullscreenButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleFullScreen();
        canvas.focus(); // Prevent toggling fullscreen again when trying to continue
    });

    restartButton.addEventListener("click", (event) => {
        event.stopPropagation();
        window.location.reload();
    });

    // --- Final Initial Load Steps ---
    await initialize();
    setState(GameState.Init);

    // --- Conditional Logic for First Interaction ---
    if (hasTouchScreen) {
        startButton.addEventListener(
            "click",
            async (event) => {
                event.stopPropagation();
                // Actions on START button click
                await toggleFullScreen();
                canvas.focus();
                await postInitActions();
            },
            { passive: false, once: true },
        );
    } else {
        // Non-touch device
        await waitForProgressInput();
        await postInitActions();
    }
};
