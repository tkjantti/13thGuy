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

import { Area, overlap } from "./Area";
import { Camera } from "./Camera";
import { Character, CHARACTER_DIMENSIONS, FALL_TIME } from "./Character";
import { GameObject } from "./GameObject";
import { canvas, cx } from "./graphics";
import {
    calculateCollisionBetweenCharacters,
    calculateCollisionToObstacle,
    getMovementVelocity,
} from "./physics";
import { Track } from "./Track";
import {
    BLOCK_WIDTH,
    isSlope,
    TrackElement,
    TrackElementType,
    TT,
} from "./TrackElement";
import { Vector, ZERO_VECTOR } from "./Vector";
import {
    playTune,
    SFX_BOUNCE,
    SFX_HIT,
    SFX_TELEPORT,
    // Ignore lint errors from JS import
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
} from "./sfx/sfx.js";
import { randomMinMax } from "./random";
import { BLOCK_HEIGHT } from "./TrackElement";
import { length } from "./Vector";

const TRACK_VISIBLE_HEIGHT = 70;

const TRACK_START_Y = 400;

// Width of empty area on the left and right side of the track.
const BANK_WIDTH = 5;

// Length of empty area before the start and after the end of the
// track.
const BANK_HEIGHT = 40;

const maxSfxDistance = 3 * BLOCK_HEIGHT;

// Time after falling to being dropped to a checkpoint.
const CAMERA_CHECKPOINT_MOVEMENT_TIME = 1000;

export enum State {
    RUNNING,
    GAME_OVER,
    FINISHED,
}

// https://stackoverflow.com/a/12646864
function shuffleArray<T>(array: T[]) {
    for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
export class Level implements Area {
    private camera: Camera = new Camera(this, canvas);
    private platePattern: CanvasPattern | null | undefined;
    private track: Track;

    public characters: Character[] = [];
    private charactersCount = 40;
    public player = new Character(0, undefined, 0, 0);

    readonly x;
    readonly y;
    readonly width;
    readonly height;

    state: State = State.RUNNING;

    constructor(
        trackTemplate: readonly TT[],
        playerWidthOffset: number,
        playerHeightOffset: number,
        chars: Character[] | undefined,
        platePattern: CanvasPattern | null | undefined,
    ) {
        this.platePattern = platePattern;

        this.track = new Track(trackTemplate, TRACK_START_Y);

        this.x = 0 - this.track.width / 2 - BANK_WIDTH;
        this.y = TRACK_START_Y - this.track.height - BANK_HEIGHT;
        this.width = this.track.width + 2 * BANK_WIDTH;
        this.height = this.track.height + 2 * BANK_HEIGHT;

        const startElement = this.track.get(0);

        const CHARS_PER_ROW = 15;
        const xGap = startElement.width / CHARS_PER_ROW;
        const yGap = CHARACTER_DIMENSIONS.height * 1.9;
        const startMargin = xGap * 0.3;

        this.player = new Character(
            0,
            this.track,
            playerWidthOffset,
            playerHeightOffset,
        );
        this.characters.push(this.player);

        // Add ai characters
        for (
            let i = 1;
            i < (chars ? chars.length : this.charactersCount);
            i++
        ) {
            if (chars && chars[i].eliminated) continue; // Skip already eliminated characters

            const aiCharacter = new Character(i, this.track);
            this.characters.push(aiCharacter);
        }

        // Set start positions
        const charactersOnStartLine: Character[] = [
            this.player,
            ...this.characters,
        ];

        shuffleArray(charactersOnStartLine);

        for (let i = 0; i < charactersOnStartLine.length; i++) {
            const c = charactersOnStartLine[i];
            const row = Math.floor(i / CHARS_PER_ROW);
            const col = i % CHARS_PER_ROW;

            const startPosition = {
                x: startElement.minX + startMargin + col * xGap,
                y: startElement.y + row * yGap,
            };

            c.x = startPosition.x;
            c.y = startPosition.y;
        }

        this.camera.follow(this.player);
        this.camera.visibleAreaHeight = TRACK_VISIBLE_HEIGHT;
        // Characted should be 1/4 height from bottom
        this.camera.yAdjust = -(1 / 4);
        this.camera.update(0);
    }

    update(t: number, dt: number): void {
        this.camera.update(t);

        this.track.update(t, dt, this.characters);

        this.calculateMovement(t, dt);

        this.checkCollisions();

        for (let ci = 0; ci < this.characters.length; ci++) {
            const c = this.characters[ci];

            c.move();
        }

        this.updateCharacterRanks();
        this.checkGameState();
    }

    private playWithVolumeByDistance(sound: string, y: number): void {
        const yDistance = Math.abs(y - this.player.y);
        playTune(
            sound,
            Math.max(0, Math.min(1, 1 - yDistance / maxSfxDistance)),
        );
    }

    private calculateMovement(t: number, dt: number): void {
        for (let i = 0; i < this.characters.length; i++) {
            const c = this.characters[i];

            const range = this.track.getBetween(c.y, c.y + c.height);

            let movementDirection: Vector = ZERO_VECTOR;

            if (c.fallStartTime != null) {
                // Can't move when falling.
                const fallTime = t - c.fallStartTime;
                if (fallTime > FALL_TIME + CAMERA_CHECKPOINT_MOVEMENT_TIME) {
                    this.dropToLatestCheckpoint(t, c);
                }
            } else if (
                c.fallStartTime == null &&
                !this.track.isOnPlatform(range, c)
            ) {
                c.fallStartTime = t;
                if (c === this.player) {
                    setTimeout(() => {
                        const checkpoint = this.track.getCheckpoint(
                            this.player.latestCheckpointIndex,
                        );
                        const dropY = checkpoint.y + checkpoint.height / 2;

                        this.camera.setTransition({
                            startY: this.player.y,
                            endY: dropY,
                            startTime: t,
                            // A bit longer duration here looks better for some reason.
                            duration: CAMERA_CHECKPOINT_MOVEMENT_TIME + 500,
                        });
                    }, FALL_TIME);
                }
            } else {
                movementDirection = c.getMovement(t);

                c.setDirection(movementDirection);
                c.velocity = getMovementVelocity(c, movementDirection, dt);
            }
        }
    }

    private checkCollisions(): void {
        // Calculate collisions to other characters.
        for (let ci = 0; ci < this.characters.length; ci++) {
            const c = this.characters[ci];

            if (c.doesNotCollide) continue;

            for (let oi = ci + 1; oi < this.characters.length; oi++) {
                const other = this.characters[oi];
                if (other.doesNotCollide) continue;

                if (calculateCollisionBetweenCharacters(c, other)) {
                    // Check if character is the player or the velocity is bit larger in any direction to prevent too much sfx plays
                    if (!c.ai || length(c.velocity) > 0.3)
                        this.playWithVolumeByDistance(SFX_HIT, c.y);
                }
            }
        }

        // The obstacles shall have the final word on collision detection.
        for (let ci = 0; ci < this.characters.length; ci++) {
            const c = this.characters[ci];

            const range = this.track.getBetween(c.y, c.y + c.height);
            const { minI, maxI } = range;

            for (let ei = minI; ei <= maxI; ei++) {
                const element = this.track.get(ei);
                for (let oi = 0; oi < element.objects.length; oi++) {
                    const o = element.objects[oi];

                    // Basic distance check if sound should be played
                    if (calculateCollisionToObstacle(c, o)) {
                        this.playWithVolumeByDistance(SFX_BOUNCE, o.y);
                    }
                }
            }
        }
    }

    private renderText(text: string, x: number, y: number, width: number) {
        const textMetrics = cx.measureText(text);
        const textX = x + (width - textMetrics.width) / 2;
        cx.fillText(text, textX, y);
    }

    private updateCharacterRanks(): void {
        // Separate finished and unfinished characters
        const finishedCharacters = this.characters.filter(
            (char) => char.finished,
        );
        const unfinishedCharacters = this.characters.filter(
            (char) => !char.finished,
        );

        // Sort finished characters based on their rank
        finishedCharacters.sort((a, b) => a.rank - b.rank);

        // Sort unfinished characters based on their Y coordinate
        unfinishedCharacters.sort(
            (a, b) => a.y + a.height / 2 - (b.y + b.height / 2),
        );

        // Merge finished and sorted unfinished characters
        const sortedCharacters = [
            ...finishedCharacters,
            ...unfinishedCharacters,
        ];

        // Update ranks of characters
        sortedCharacters.forEach((char, index) => {
            char.rank = index + 1;
        });
    }

    private checkGameState(): void {
        for (let ci = 0; ci < this.characters.length; ci++) {
            const c = this.characters[ci];

            const checkpointIndex = this.track.findLatestCheckpoint(c.y);
            const range = this.track.getBetween(c.y, c.y + c.height);

            // Falling, do not do anything
            if (c.fallStartTime != null || !this.track.isOnPlatform(range, c))
                continue;

            if (checkpointIndex > c.latestCheckpointIndex) {
                c.latestCheckpointIndex = checkpointIndex;
                //  13th character will be eliminated if it falls or is 13th in checkpoint
                if (c.rank === 13) {
                    c.eliminated = true;
                    c.stop();
                    if (!c.ai) this.state = State.GAME_OVER;
                    continue;
                }
            }

            // TODO: take some steps after finish
            if (c.y + c.height < this.track.finishY) {
                if (c.rank === 13) {
                    c.eliminated = true;
                    c.stop();
                    if (!c.ai) this.state = State.GAME_OVER;
                } else {
                    c.finished = true;
                    c.stop();
                }

                // If all finished but last 13, or player finishes
                if (!c.ai || c.rank == this.characters.length - 13) {
                    let eliminatedCount = this.characters.filter(
                        (character) => character.eliminated,
                    ).length;

                    // Set all unfinished characters as eliminated
                    for (let ci = 0; ci < this.characters.length; ci++) {
                        if (
                            this.characters[ci].rank >
                            this.characters.length - 13
                        ) {
                            if (eliminatedCount < 13) {
                                if (!this.characters[ci].eliminated) {
                                    this.characters[ci].eliminated = true;
                                    eliminatedCount++;
                                }
                            } else {
                                break;
                            }
                        }
                    }

                    // If player character is eliminated or finishes
                    if (this.characters[0].eliminated) {
                        this.state = State.GAME_OVER;
                    } else {
                        this.state = State.FINISHED;
                    }
                }
            }
        }
    }

    private dropToLatestCheckpoint(t: number, c: Character): void {
        const checkpoint = this.track.getCheckpoint(c.latestCheckpointIndex);

        const dropPosition: Area = {
            x: randomMinMax(
                checkpoint.minX + BLOCK_WIDTH,
                checkpoint.maxX - BLOCK_WIDTH,
            ),
            y: checkpoint.y + checkpoint.height / 2,
            width: c.width,
            height: c.height,
        };

        if (this.characters.some((o) => overlap(o, dropPosition))) {
            // No luck, wait for the next frame.
            return;
        }

        //  13th character will be eliminated if it falls
        if (c.rank === 13) {
            c.eliminated = true;
            c.stop();
            if (!c.ai) this.state = State.GAME_OVER;
            return;
        }

        c.drop(t, dropPosition);

        this.playWithVolumeByDistance(SFX_TELEPORT, c.y);

        if (c === this.player) {
            this.camera.follow(c);
        }
    }

    // Function to draw a cross (❌) for better browser compatibility
    private drawCross(
        x: number,
        y: number,
        size: number,
        color: string = "red",
    ): void {
        cx.strokeStyle = color;
        cx.lineWidth = size / 4;
        cx.beginPath();
        cx.moveTo(x - size / 2, y - size / 2);
        cx.lineTo(x + size / 2, y + size / 2);
        cx.moveTo(x + size / 2, y - size / 2);
        cx.lineTo(x - size / 2, y + size / 2);
        cx.stroke();
    }

    draw(t: number, dt: number): void {
        cx.save();
        // Apply camera - drawing in level coordinates after these lines:
        cx.translate(canvas.width / 2, canvas.height / 2);
        cx.scale(this.camera.zoom, this.camera.zoom);
        cx.translate(-this.camera.x, -this.camera.y);

        const objectsToDraw: GameObject[] = [...this.characters];

        this.drawTrack(objectsToDraw);

        this.drawObjects(t, dt, objectsToDraw);

        cx.restore(); // End camera - Drawing no longer in level coordinates

        this.drawGradient();

        if (this.state === State.RUNNING) {
            cx.save();
            // Apply camera - drawing in level coordinates after these lines:
            cx.translate(canvas.width / 2, canvas.height / 2);
            cx.scale(this.camera.zoom, this.camera.zoom);
            cx.translate(-this.camera.x, -this.camera.y);

            this.drawStatusOfCharacters(t);

            this.drawTopStatusTexts();

            cx.restore(); // End camera - Drawing no longer in level coordinates
        }
    }

    drawTrack(objectsToDraw: GameObject[]): void {
        cx.save();

        const viewArea = this.camera.getViewArea();
        const { minI, maxI } = this.track.getBetween(
            viewArea.y,
            viewArea.y + viewArea.height,
        );

        for (let e = maxI; e >= minI; e--) {
            const element = this.track.get(e);

            const surfaces = element.surfaces;
            cx.fillStyle = element.color;
            cx.shadowColor = element.color
                .replace("rgb(", "rgba(")
                .replace(")", ",0.3)");
            cx.shadowOffsetY =
                element.height *
                (element.type === TrackElementType.Raft ? 2 : 6);

            if (element.type === TrackElementType.Raft) cx.globalAlpha = 0.5;

            for (let i = 0; i < surfaces.length; i++) {
                const surface = surfaces[i];

                this.drawSurface(element, surface);
            }

            cx.globalAlpha = 1;

            objectsToDraw.push(...element.objects);
        }

        cx.restore();
    }

    drawSurface(element: TrackElement, surface: Area): void {
        cx.strokeStyle = "rgba(255,255,255,0.4)";
        cx.lineWidth = 0.1;
        // Borders for other than rafts
        if (element.type !== TrackElementType.Raft) {
            cx.strokeRect(
                surface.x,
                surface.y + 0.1,
                surface.width,
                surface.height,
            );
        }

        cx.save();
        if (isSlope(surface)) {
            const f = surface.force;
            cx.fillStyle = `rgba(${220 + f * 50}, ${80 + f * 50}, ${60 + f * 50}, ${1 - f})`;
        }

        // Surface
        cx.fillRect(surface.x, surface.y, surface.width, surface.height);
        cx.restore();

        // Borders for rafts
        if (element.type === TrackElementType.Raft) {
            cx.strokeRect(surface.x, surface.y, surface.width, surface.height);
        } else if (isSlope(surface)) {
            // Texture with arrows pointing up
            cx.shadowOffsetY = 0;
            cx.font = "9px Arial";
            cx.textAlign = "center";
            cx.textBaseline = "middle";
            cx.fillStyle = "rgba(255, 255, 255, 0.1)";

            const spacing = element.width / (element.width / 10);

            for (let i = 1; i <= surface.width / 9 - 1; i++) {
                cx.fillText(
                    "⇪",
                    surface.x + i * spacing,
                    surface.y + surface.height / 2,
                );
            }
        } else if (
            element.type === TrackElementType.CheckPoint ||
            element.type === TrackElementType.Finish
        ) {
            cx.fillStyle = "rgba(255, 255, 255, 0.2)";
            cx.fillRect(
                surface.x,
                surface.y + surface.height - 4,
                surface.width,
                4,
            );
            cx.shadowOffsetY = 0;
            cx.font = "9px Arial";
            cx.textAlign = "center";
            cx.textBaseline = "middle";
            cx.fillStyle = "rgba(255, 255, 255, 0.1)";

            const spacing = element.width / 10;

            for (let i = 1; i <= surface.width / 9 - 1; i++) {
                cx.fillText(
                    element.type === TrackElementType.Finish ? "✪" : "✓",
                    surface.x + i * spacing,
                    surface.y + surface.height / 2.4,
                );
            }
        }

        if (this.platePattern) {
            cx.fillStyle = this.platePattern;
            cx.fillRect(surface.x, surface.y, surface.width, surface.height);
            cx.fillStyle = element.color;
        }
    }

    drawObjects(t: number, dt: number, objectsToDraw: GameObject[]) {
        // Sort the objects so that objects in front get drawn after
        // objects behind them.
        objectsToDraw.sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2));

        for (let i = 0; i < objectsToDraw.length; i++) {
            const c = objectsToDraw[i];
            c.draw(t, dt);
        }
    }

    drawGradient(): void {
        const gradient = cx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            0,
            canvas.width / 2,
            canvas.height / 2,
            canvas.width / 1.5,
        );
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(0.8, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
        cx.fillStyle = gradient;
        cx.fillRect(0, 0, canvas.width, canvas.height);

        const gradientL = cx.createLinearGradient(0, 0, 0, canvas.height);
        gradientL.addColorStop(0, "rgba(0, 0, 0, 1)");
        gradientL.addColorStop(0.2, "rgba(0, 0, 0, 0.5)");
        gradientL.addColorStop(1, "rgba(0, 0, 0, 0)");
        cx.fillStyle = gradientL;
        cx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawStatusOfCharacters(t: number) {
        this.characters.forEach((char) => {
            if (char.isVisible(t)) {
                const text = `${char.rank}`;
                cx.fillStyle =
                    char.rank === 13
                        ? "red"
                        : char.eliminated
                          ? "crimson"
                          : char.rank > this.characters.length - 13
                            ? "orange"
                            : char.rank === 1
                              ? "lightgreen"
                              : char.ai
                                ? "white"
                                : "yellow";

                cx.font = !char.ai
                    ? "1.4px Sans-serif"
                    : char.eliminated || char.rank === 13
                      ? "1.2px Sans-serif"
                      : "1px Sans-serif";

                if (!char.ai) {
                    cx.save();
                    cx.font = "4.0px Sans-serif";
                    this.renderText(
                        "▲",
                        char.x,
                        char.y - char.height * 3.25,
                        char.width,
                    );

                    cx.restore();
                }

                if (char.eliminated) {
                    this.drawCross(
                        char.x - 0.25,
                        char.y - char.height * 2.7,
                        1,
                    );
                }
                this.renderText(
                    char.eliminated ? "13" : text,
                    char.x,
                    char.y - char.height * 2.5,
                    char.width,
                );
            }
        });
    }

    drawTopStatusTexts() {
        const eliminatedCharactersCount = this.characters
            .filter((char) => char.eliminated)
            .length.toString();

        const finishedCharactersCount = this.characters
            .filter((char) => char.finished)
            .length.toString();

        cx.font = "4px Impact";
        cx.fillStyle =
            this.player.rank === 13
                ? "red"
                : this.player.eliminated
                  ? "crimson"
                  : this.player.rank > this.characters.length - 13
                    ? "orange"
                    : this.player.rank === 1
                      ? "lightgreen"
                      : "yellow";

        cx.fillText(
            "▲ " + this.player.rank + " / " + this.characters.length,
            -42,
            this.camera.y - 30,
        );
        cx.fillStyle = "green";
        cx.fillText(
            "✪ " +
                finishedCharactersCount +
                " / " +
                (this.characters.length - 13) +
                " QUALIFIED",
            -15,
            this.camera.y - 30,
        );
        cx.fillStyle = "red";
        this.drawCross(28, this.camera.y - 31.5, 3);
        cx.fillText(
            eliminatedCharactersCount + " / 13",
            32,
            this.camera.y - 30,
        );
    }
}
