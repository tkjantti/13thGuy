import { canvas, cx } from "./graphics";
import {
    initializeKeyboard,
    sleep,
    waitForAnyKey,
    waitForEnter,
} from "./keyboard";
import { Level, State } from "./Level";
import { thirdTrack, secondTrack, simpleTrack } from "./tracks";

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
    renderCharacter,
} from "./CharacterAnimation.js";
import { playerColor } from "./Character.js";

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

const maxRadius = Math.max(screen.width, screen.height) / 1.5;

enum GameState {
    Init,
    Start,
    Wait,
    Ready,
    Running,
    GameOver,
    GameFinished,
}

let gameState: GameState = GameState.Init;

// For drawing start- and game over screens.
let radius = 0;

const setState = (state: GameState): void => {
    gameState = state;

    switch (state) {
        case GameState.Start:
            break;
        case GameState.Ready:
            if (raceNumber > 1 && !level.player.eliminated) {
                const track = raceNumber === 3 ? thirdTrack : secondTrack;
                level = new Level(
                    track,
                    randomWidhOffset,
                    randomHeighOffset,
                    level.characters,
                );
            } else {
                level = new Level(
                    simpleTrack,
                    randomWidhOffset,
                    randomHeighOffset,
                    undefined,
                );
            }
            raceNumber++;
            radius = maxRadius;
            playTune(SFX_RACE);
            break;
        case GameState.Running:
            break;
        case GameState.GameOver:
            radius = 1;
            playTune(SFX_GAMEOVER);
            randomWidhOffset = 1 + Math.random() * 0.6;
            randomHeighOffset = 1 + Math.random() * 0.3;
            waitForEnter().then(() => {
                playTune(SFX_RESTART);
                startRace();
            });
            break;
        case GameState.GameFinished:
            playTune(SFX_FINISHED);
            // Players left for next round?
            if (level.characters.length > 14) {
                sleep(8000).then(() => setState(GameState.Ready));
            } else {
                waitForEnter().then(() => startRace());
            }
            break;
        default:
            break;
    }
};

const gameLoop = (t: number): void => {
    requestAnimationFrame(gameLoop);

    const dt = Math.min(t - lastTime, MAX_FRAME);
    lastTime = t;

    update(t, dt);
    draw(t, dt);
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
        default:
            break;
    }
};

const centerText = (
    text: string,
    fontSize: number,
    fontName: string,
    alpha = 1,
    yAdjust = 0,
) => {
    cx.save();
    cx.globalAlpha = alpha > 0 ? alpha : 0;
    cx.fillStyle = "white";
    cx.font = fontSize + "px " + fontName;
    const textWidth = cx.measureText(text).width;
    cx.fillText(
        text,
        (canvas.width - textWidth) / 2,
        canvas.height / 2 + yAdjust,
    );
    cx.restore();
};

const draw = (t: number, dt: number): void => {
    cx.save();
    cx.fillStyle = "rgb(0, 0, 10)";
    cx.fillRect(0, 0, canvas.width, canvas.height);
    level?.draw(t, dt);
    cx.restore();

    cx.save();
    switch (gameState) {
        case GameState.Start: {
            drawStartScreen(t++, false, 0);

            break;
        }
        case GameState.Wait: {
            drawStartScreen(t++, true, (z = z + 0.01));

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
                    centerText("▲ GO! ▲", 64, "Impact", 1);
                } else if (radius < maxRadius / 2) {
                    centerText("Set...", 64, "Impact", 1);
                } else {
                    centerText("Ready...", 64, "Impact", 1);
                }

                if (radius > 0) {
                    radius -= dt / 2;
                }
            }
            applyGradient();

            break;
        }
        case GameState.GameOver: {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            cx.beginPath();
            cx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            cx.fillStyle = "#802010";
            cx.fill();
            centerText("❌ ELIMINATED!", 48, "Impact", 1, -70);
            if (level.player.rank === 13) {
                centerText("Don't be the 13TH GUY", 24, "Sans-serif", 1, 0);
            } else {
                centerText(
                    "Don't be one of the last 13TH GUYs",
                    24,
                    "Sans-serif",
                    1,
                    0,
                );
                centerText(
                    "The final rank is " + level.player.rank + ".",
                    32,
                    "Impact",
                    1,
                    50,
                );
            }
            if (radius >= maxRadius) {
                centerText("Press ENTER", 24, "Sans-serif", 1, 100);
            }

            if (radius < maxRadius) {
                cx.save();
                cx.globalAlpha = 0.7;
                cx.translate(canvas.width / 8, radius * 2 - canvas.height);
                renderCharacter(
                    cx,
                    "gray",
                    (canvas.height / 6) * randomWidhOffset,
                    (canvas.height / 2) * randomHeighOffset,
                    t,
                    CharacterFacingDirection.Backward,
                    CharacterAnimation.Fall,
                );
                cx.globalAlpha = 0;
                cx.restore();
            }
            if (radius < maxRadius) {
                radius += dt;
            }

            applyGradient();

            break;
        }
        case GameState.GameFinished: {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            if (radius >= 50) {
                cx.beginPath();
                cx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                cx.fillStyle = "#105000";
                cx.fill();

                if (level.characters.length > 14) {
                    centerText("✪ QUALIFIED!", 48, "Impact", 1, -80);
                    centerText("☻", 80, "Impact", 1, 0);
                    centerText(
                        "Ready for next round " + raceNumber + " / 3",
                        32,
                        "Sans-serif",
                        1,
                        60,
                    );
                } else {
                    centerText("GAME FINISHED!", 48, "Impact", 1, -80);
                    centerText("☻", 80, "Impact", 1, 0);
                    centerText(
                        "Congratulations to the winner!",
                        32,
                        "Impact",
                        1,
                        60,
                    );
                    centerText("Press ENTER", 32, "Sans-serif", 1, 120);
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
                        : CharacterFacingDirection.Backward,
                    level.characters.length > 14
                        ? CharacterAnimation.Walk
                        : CharacterAnimation.Stand,
                );
                cx.restore();
            }

            if (radius < maxRadius) {
                radius += dt;
            }
            applyGradient();

            break;
        }
        default: {
            applyGradient(true);

            break;
        }
    }

    cx.restore();
};

const applyCRTEffect = (): void => {
    const imageData = cx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;

            // Apply scanlines
            if (y % 2 === 0) {
                data[index] *= 0.5; // Red
                data[index + 1] *= 0.5; // Green
                data[index + 2] *= 0.5; // Blue
            }

            // Apply noise
            const noise = (Math.random() - 0.5) * 20;
            data[index] += noise; // Red
            data[index + 1] += noise; // Green
            data[index + 2] += noise; // Blue
        }
    }

    cx.putImageData(imageData, 0, 0);
};

const applyGradient = (track = false) => {
    const width = canvas.width;
    const height = canvas.height;
    const gradient = cx.createRadialGradient(
        width / 2,
        height / 2,
        0, // Inner circle
        width / 2,
        height / 2,
        width / 2, // Outer circle
    );
    if (track) {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    } else {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    }

    cx.fillStyle = gradient;
    cx.fillRect(0, 0, width, height);
};

const Logo = () => {
    centerText("Don't be the", 24, "Impact", 1, -30);
    centerText("❌ 13TH GUY", 64, "Impact", 1, 30);
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
            : CharacterFacingDirection.Backward,
        CharacterAnimation.Walk,
    );
    cx.restore();

    if (wait) {
        centerText(
            "Avoid being the 13th or among the last 13",
            24,
            "Sans-serif",
            1,
            -20,
        );
        centerText(
            "or you will be eventually ❌ eliminated!",
            24,
            "Sans-serif",
            1,
            20,
        );
        centerText("⌨ W A S D ▲ ▼ ◄ ►", 24, "Sans-serif", 1, 80);
    } else {
        Logo();
        centerText("Press ENTER to start the race!", 24, "Sans-serif", 1, 80);
    }
    cx.restore();

    applyGradient();
};

const drawInitialScreen = (): void => {
    cx.save();
    cx.filter = "grayscale(1) brightness(0.6)";
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
    );
    cx.restore();
    Logo();
    applyGradient();
    applyCRTEffect();
};

export const startRace = async (): Promise<void> => {
    raceNumber = 1;
    z = 1;
    setState(GameState.Start);
    await waitForEnter();
    setState(GameState.Wait);

    setTimeout(() => {
        setState(GameState.Ready);
    }, 2400);
};

export const init = async (): Promise<void> => {
    initializeKeyboard();
    drawInitialScreen();

    await initialize().then(() =>
        centerText("Press any key", 24, "Sans-serif", 1, 80),
    );
    cx.restore();
    await waitForAnyKey();
    playTune(SFX_START);
    window.requestAnimationFrame(gameLoop);

    setState(GameState.Start);
    startRace();
};
