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

const versionText = "Director's cut (" + (VERSION ? VERSION : "DEV") + ")";

const TIME_STEP = 1000 / 60;
const MAX_FRAME = TIME_STEP * 5;

let lastTime = 0;

let raceNumber = 0;

// Randomize player character
let randomWidhOffset = 1 + Math.random() * 0.6;
let randomHeighOffset = 1 + Math.random() * 0.3;

// Player zoom level for animation
let z = 1;

let level: Level;

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

const restartButton = document.createElement("button");

const setState = async (state: GameState) => {
    gameState = state;

    const button = document.getElementById("restartButton");
    if (button) {
        button.style.display =
            state === GameState.Running || state === GameState.Start
                ? "block"
                : "none";
    }

    maxRadius = 1280 * 2;

    switch (state) {
        case GameState.Start:
            await waitForProgressInput();
            await setState(GameState.Wait);
            break;
        case GameState.Wait:
            await waitForProgressInput();
            await setState(GameState.RaceStarting);
            break;
        case GameState.RaceStarting:
            await setState(GameState.Ready);
            break;
        case GameState.Ready:
            counted = 0;
            if (raceNumber > 1 && level && !level.player.eliminated) {
                const track =
                    raceNumber === 3 ? getThirdTrack() : getSecondTrack();
                level = new Level(
                    track,
                    randomWidhOffset,
                    randomHeighOffset,
                    level.characters,
                    platePattern,
                );
            } else {
                level = new Level(
                    getFirstTrack(),
                    randomWidhOffset,
                    randomHeighOffset,
                    undefined,
                    platePattern,
                );
            }
            raceNumber++;
            radius = maxRadius;
            readyCircleStartTime = drawTime;
            playTune(SFX_RACE);
            break;

        case GameState.GameOver:
            radius = 1;
            playTune(SFX_GAMEOVER);
            randomWidhOffset = 1 + Math.random() * 0.6;
            randomHeighOffset = 1 + Math.random() * 0.3;

            await waitForProgressInput();
            playTune(SFX_RESTART);
            raceNumber = 1;
            await setState(GameState.Start);
            break;
        case GameState.GameFinished:
            radius = 1;
            playTune(SFX_FINISHED);
            if (level && level.characters.length > 14) {
                await sleep(2500);
                await waitForProgressInput();
                await setState(GameState.Ready);
            } else {
                await waitForProgressInput();
                clearCharacterGradientCache();
                raceNumber = 1;
                await setState(GameState.Start);
            }
            break;
        case GameState.Running:
            renderTouchControls();
            break;
        case GameState.Init:
            if (button) button.style.display = "none";
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
            level.update(t, dt);
            if (level.state === State.GAME_OVER) {
                setState(GameState.GameOver);
            } else if (level.state === State.FINISHED) {
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
            drawInitialScreen(true);
            renderWaitForProgressInput("start");
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
            if (level.player.rank === 13) {
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
                    "The final rank is " + level.player.rank + ".",
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
                if (level.characters.length > 14) {
                    renderText("✪ QUALIFIED!", TextSize.Large, "Impact", 1, -5);
                    renderText("☻", TextSize.Huge, "Impact");
                    renderText(
                        "Ready for next round " + raceNumber + " / 3",
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
                        : level.characters.length <= 14 || t % 3600 > 1800
                          ? CharacterFacingDirection.Backward
                          : CharacterFacingDirection.BackwardRight,
                    level.characters.length > 14
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
    goFullScreen();
    playTune(SFX_START);
    raceNumber = 1;
    await setState(GameState.Start);
}

export const init = async (): Promise<void> => {
    initializeControls();
    window.requestAnimationFrame(gameLoop);

    restartButton.id = "restartButton";
    restartButton.style.position = "absolute";
    restartButton.style.top = "10px";
    restartButton.style.right = "10px";
    restartButton.style.zIndex = "10";
    restartButton.textContent = "⟳";
    restartButton.style.padding = "5px 10px";
    restartButton.style.color = "white";
    restartButton.style.background = "black";
    restartButton.style.border = "1px solid white";
    restartButton.style.borderRadius = "4px";
    restartButton.style.fontSize = "24px";
    restartButton.style.display = "none";

    document.body.appendChild(restartButton);

    restartButton.addEventListener("click", async (event) => {
        event.stopPropagation();

        stopTune();

        exitFullScreen();
        restartButton.style.display = "none";

        z = 1;
        randomWidhOffset = 1 + Math.random() * 0.6;
        randomHeighOffset = 1 + Math.random() * 0.3;
        clearCharacterGradientCache();

        await setState(GameState.Init);

        await waitForProgressInput();

        await postInitActions();
    });

    await initialize();
    await setState(GameState.Init);

    await waitForProgressInput();

    await postInitActions();
};

// Function to request fullscreen
function goFullScreen() {
    const elem = document.documentElement as HTMLElement & {
        mozRequestFullScreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
    };
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => {
            console.error(
                `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
            );
        });
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen().catch((err) => {
            console.error(
                `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
            );
        });
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen().catch((err) => {
            console.error(
                `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
            );
        });
    }
}

// Function to exit fullscreen
function exitFullScreen() {
    const doc = document as Document & {
        mozCancelFullScreen?: () => Promise<void>;
        webkitExitFullscreen?: () => Promise<void>;
    };
    if (doc.exitFullscreen) {
        doc.exitFullscreen().catch((err) => {
            console.error(
                `Error attempting to disable full-screen mode: ${err.message} (${err.name})`,
            );
        });
    } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen().catch((err) => {
            console.error(
                `Error attempting to disable full-screen mode: ${err.message} (${err.name})`,
            );
        });
    } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen().catch((err) => {
            console.error(
                `Error attempting to disable full-screen mode: ${err.message} (${err.name})`,
            );
        });
    }
}
