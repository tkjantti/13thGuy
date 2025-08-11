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
    initializeGraphics,
    shouldRender,
    checkPerformanceOnRaceStart,
    resetRacePerformanceCheck,
    setRaceMode,
} from "./graphics";
import { renderText, TextSize } from "./text";
import { sleep } from "./keyboard";
import { Level, State } from "./Level";
import { getFirstTrack, getSecondTrack, getThirdTrack } from "./tracks";

import { initializeAudio, playSound, stopAllTunes, Sound } from "./audio";
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
    renderWaitForProgressInput,
    setTouchControlsVisibility,
    updateControls,
    waitForProgressInput,
} from "./controls";
import { hasTouchScreen } from "./touchscreen";
import { toggleFullScreen } from "./core/graphics/fullscreen";
import {
    createFullscreenButton,
    createRestartButton,
    createStartButton,
    createPerformanceToggleButton,
    START_BUTTON_ID,
    RESTART_BUTTON_ID,
    FULLSCREEN_BUTTON_ID,
} from "./buttons";

const versionText = VERSION ? VERSION : "DEV";

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

const setState = async (state: GameState) => {
    gameState = state;

    // Set race mode flag based on game state
    // IMPORTANT: Only consider Running and Ready as race modes, not GameFinished/GameOver
    setRaceMode(state === GameState.Running || state === GameState.Ready);

    const restartButton = document.getElementById(RESTART_BUTTON_ID);
    if (restartButton) {
        restartButton.style.display =
            state !== GameState.Init ? "block" : "none";
    }

    const fullscreenButton = document.getElementById(FULLSCREEN_BUTTON_ID);
    if (fullscreenButton) {
        fullscreenButton.style.display =
            state !== GameState.Init || !hasTouchScreen ? "block" : "none";
    }

    setTouchControlsVisibility(state === GameState.Running);

    maxRadius = 1280 * 2;

    switch (state) {
        case GameState.Start:
            // Sound.Start or Sound.Restart is playing
            await sleep(0);
            await waitForProgressInput(); // Now wait for a genuinely new input
            setState(GameState.Wait);
            break;
        case GameState.Wait:
            // Sound.Start continues playing.
            await waitForProgressInput(Sound.Race);
            setState(GameState.RaceStarting);
            break;
        case GameState.RaceStarting:
            // Sound.Start continues playing
            setState(GameState.Ready);
            break;
        case GameState.Ready:
            counted = 0; // Ensure counted is 0 when entering Ready
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

            checkPerformanceOnRaceStart();
            break;

        case GameState.GameOver:
            radius = 1;
            playSound(Sound.GameOver); // Play game over tune
            randomWidhOffset = 1 + Math.random() * 0.6;
            randomHeighOffset = 1 + Math.random() * 0.3;

            await waitForProgressInput(Sound.Restart);
            raceNumber = 1;
            setState(GameState.Start);
            break;
        case GameState.GameFinished:
            // Make doubly sure we're not in race mode anymore
            setRaceMode(false);
            resetRacePerformanceCheck();

            radius = 1;
            playSound(Sound.Finished);
            if (level && level.characters.length > 14) {
                // Qualified
                await waitForProgressInput(Sound.Race);
                raceNumber++; // Increment race number for the next round
                setState(GameState.Ready);
            } else {
                // Final Winner
                await waitForProgressInput(Sound.Start);
                raceNumber = 1;
                clearCharacterGradientCache();
                setState(GameState.Start);
            }
            break;
        case GameState.Running:
            break;
        case GameState.Init:
            stopAllTunes();
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

        if (shouldRender(t)) {
            draw(t, cappedDeltaTime);
        }
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
                playSound(Sound.Go);
                counted++;
            } else if (counted === 1 && radius < maxRadius / 2) {
                playSound(Sound.Count);
                counted++;
            } else if (counted === 0 && radius < maxRadius) {
                playSound(Sound.Count);
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

            break;
        }
    }

    cx.restore();
};

const Logo = () => {
    renderText(
        "FROST𖤓SUN",
        TextSize.Small,
        "Impact",
        1,
        4,
        false,
        0,
        "FROST𖤓SUN",
        ["#ACD5F3", "orange"],
    );

    renderText("presents", TextSize.Tiny, "Impact", 0.5, 5.25, false);

    renderText("Don't be the", TextSize.Small, "Impact", 1, -1.8, true, -0.7);
    renderText("❌ 13TH GUY", TextSize.Xl, "Impact", 1, 1.8);

    renderText(
        "Director's cut",
        TextSize.Small,
        "Impact",
        0.5,
        3.8,
        true,
        -0.1,
    );

    renderText(versionText, TextSize.Tiny, "Impact", 0.5, 34, false);
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

    // Add the toggle button
    const toggleBtn = createPerformanceToggleButton();
    document.body.appendChild(toggleBtn);

    raceNumber = 1;
    setState(GameState.Start);
}

export const init = async (): Promise<void> => {
    // Make sure the canvas can can be focused
    canvas.tabIndex = 0;
    canvas.style.outline = "none"; // Prevents outline when focused

    // --- Initial Setup ---
    initializeGraphics();
    initializeControls();
    lastTime = performance.now();
    window.requestAnimationFrame(gameLoop);

    // Create UI buttons
    const fullscreenButton = createFullscreenButton(hasTouchScreen);
    const restartButton = createRestartButton();
    const startButton = createStartButton();

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
    await initializeAudio();
    setState(GameState.Init);

    // --- Conditional Logic for First Interaction ---
    if (hasTouchScreen) {
        startButton.addEventListener(
            "click",
            async (event) => {
                event.stopPropagation();

                // Hide button immediately
                startButton.style.display = "none";

                // IMPORTANT: Play sound BEFORE attempting fullscreen
                playSound(Sound.Start);

                // Wait a brief moment to let audio initialize
                await new Promise((resolve) => setTimeout(resolve, 100));

                await toggleFullScreen();

                canvas.focus();
                await postInitActions();
            },
            { passive: false, once: true },
        );
    } else {
        // Non-touch device
        await waitForProgressInput(Sound.Start);
        await postInitActions();
    }
};
