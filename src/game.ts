import {
    applyCRTEffect,
    applyGradient,
    applyGrayscale,
    renderText,
    canvas,
    cx,
    createFabricTexture,
    createPlateTexture,
} from "./graphics";
import {
    initializeKeyboard,
    sleep,
    waitForAnyKey,
    waitForEnter,
} from "./keyboard";
import { Level, State } from "./Level";
import { getFirstTrack, getSecondTrack, getThirdTrack } from "./tracks";

import {
    initialize,
    playTune,
    SFX_START,
    SFX_RACE,
    SFX_FINISHED,
    SFX_GAMEOVER,
    SFX_RESTART,
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

// For drawing start- and game over screens.
let radius = 0;

const pattern = createFabricTexture();
const platePattern = createPlateTexture();

const setState = async (state: GameState) => {
    gameState = state;

    maxRadius = 1280 * 2; // Always same size to make animations last the same time (max canvas * 2)

    switch (state) {
        case GameState.Start:
            break;
        case GameState.Ready:
            if (raceNumber > 1 && !level.player.eliminated) {
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
            playTune(SFX_RACE);
            break;

        case GameState.GameOver:
            radius = 1;
            playTune(SFX_GAMEOVER);
            randomWidhOffset = 1 + Math.random() * 0.6;
            randomHeighOffset = 1 + Math.random() * 0.3;

            await waitForEnter();
            playTune(SFX_RESTART);
            startRace();
            break;
        case GameState.GameFinished:
            radius = 1;
            playTune(SFX_FINISHED);
            // Players left for next round?
            if (level.characters.length > 14) {
                await sleep(2500);
                await waitForEnter();
                setState(GameState.Ready);
            } else {
                await waitForEnter();
                clearCharacterGradientCache();
                startRace();
            }
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
            level.update(t, dt);
            if (level.state === State.GAME_OVER) {
                setState(GameState.GameOver);
            } else if (level.state === State.FINISHED) {
                setState(GameState.GameFinished);
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

const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");

const RenderWaitForKey = (text = "Press ENTER to continue", y = 100) => {
    renderText(
        text + (textAnimationCounter++ % 60 === 0 ? "" : "█"),
        24,
        "Courier New",
        1,
        canvas.height / 2 + y,
        false,
        canvas.width / 2 -
            // Let's check if Firefox as there is a difference in rendering this versus Chromium based browsers
            cx.measureText(text).width * (isFirefox ? 1.95 : 2) +
            64,
    );
};

const draw = (t: number, dt: number): void => {
    cx.save();
    cx.fillStyle = "rgb(0, 0, 20)";
    cx.fillRect(0, 0, canvas.width, canvas.height);
    level?.draw(t, dt);
    cx.restore();

    cx.save();

    switch (gameState) {
        case GameState.Load: {
            RenderWaitForKey(
                textAnimationCounter < 10
                    ? loadingText.substring(0, textAnimationCounter)
                    : "LOADING...",
            );
            textAnimationCounter++;
            applyGrayscale();
            applyCRTEffect(false);

            break;
        }
        case GameState.Init: {
            drawInitialScreen(true);
            RenderWaitForKey("Press any key");
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
                        64,
                        "Impact",
                        (radius / maxRadius) * 4,
                    );
                } else if (radius < maxRadius / 2) {
                    renderText("Set...", 64, "Impact", 1);
                } else {
                    renderText("Ready...", 64, "Impact", 1);
                }

                if (radius > 0) {
                    radius -= dt / 2.55; // Counting should match the music
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
            renderText("❌ ELIMINATED!", 48, "Impact", 1, -70);
            if (level.player.rank === 13) {
                renderText("Don't be the 13TH GUY", 24, "Sans-serif", 1, 0);
            } else {
                renderText(
                    "Don't be one of the last 13TH GUYs",
                    24,
                    "Sans-serif",
                    1,
                    0,
                );
                renderText(
                    "The final rank is " + level.player.rank + ".",
                    32,
                    "Impact",
                    1,
                    50,
                );
            }
            if (radius >= maxRadius) {
                RenderWaitForKey("Press ENTER to continue", 120);
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
                    renderText("✪ QUALIFIED!", 48, "Impact", 1, -80);
                    renderText("☻", 80, "Impact", 1, 0);
                    renderText(
                        "Ready for next round " + raceNumber + " / 3",
                        32,
                        "Sans-serif",
                        1,
                        60,
                    );
                } else {
                    renderText("GAME FINISHED!", 48, "Impact", 1, -80);
                    renderText("☻", 80, "Impact", 1, 0);
                    renderText(
                        "Congratulations to the winner!",
                        32,
                        "Impact",
                        1,
                        60,
                    );
                }

                if (radius >= maxRadius) {
                    RenderWaitForKey();
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

            break;
        }
    }

    cx.restore();
};

const Logo = () => {
    renderText("Don't be the", 24, "Impact", 1, -30);
    renderText("❌ 13TH GUY", 64, "Impact", 1, 30);
    renderText(versionText, 16, "Impact", 0.5, 20, false, canvas.width - 240);
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
            24,
            "Sans-serif",
            1,
            -20,
        );
        renderText(
            "or you will be eventually ❌ eliminated!",
            24,
            "Sans-serif",
            1,
            20,
        );
        renderText("MOVE WITH", 20, "Sans-serif", 0.8, -120);
        renderText("▲ / W - ▼ / S - ◄ / A - ► / D", 20, "Sans-serif", 0.8, -90);

        if (gameState === GameState.Wait) {
            RenderWaitForKey("Press ENTER to start the race!");
        }
    } else {
        Logo();
        RenderWaitForKey();
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

export const startRace = async (): Promise<void> => {
    raceNumber = 1;
    z = 1;
    setState(GameState.Start);
    await waitForEnter();
    setState(GameState.Wait);

    await waitForEnter();
    setState(GameState.RaceStarting);
    await sleep(1000);
    setState(GameState.Ready);
};

export const init = async (): Promise<void> => {
    initializeKeyboard();
    window.requestAnimationFrame(gameLoop);

    await initialize();
    setState(GameState.Init);

    await waitForAnyKey();

    playTune(SFX_START);
    setState(GameState.Start);
    startRace();
};
