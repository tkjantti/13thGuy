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

import { Ai } from "./Ai";
import { Dimensions } from "./Area";
import {
    CharacterAnimation,
    CharacterFacingDirection,
    renderCharacter,
} from "./CharacterAnimation";
import { easeInQuad } from "./easings";
import { GameObject } from "./GameObject";
import { cx } from "./graphics";
import { getKeys } from "./keyboard";
import { random } from "./random";
import { mirrorHorizontally } from "./rendering";
import { Track } from "./Track";
import { isZero, normalize, Vector, ZERO_VECTOR } from "./Vector";

export const FALL_TIME: number = 500;

const colors: string[] = [
    "yellow",
    "red",
    "green",
    "blue",
    "orange",
    "tomato",
    "pink",
    "slateblue",
    "violet",
    "dodgerblue",
    "cyan",
    "magenta",
    "lightgreen",
    "lightgray",
    "turquoise",
    "deepskyblue",
    "lightblue",
    "lightcoral",
    "springgreen",
    "fuchsia",
    "crimson",
    "lavender",
    "coral",
    "teal",
    "indigo",
    "salmon",
    "chartreuse",
    "periwinkle",
    "lightpink",
    "chocolate",
    "peach",
    "mint",
    "aqua",
    "indianred",
    "olive",
    "beige",
    "skyblue",
    "mediumturquoise",
    "sienna",
    "lime",
    "azure",
];

export const playerColor = colors[0];

export const CHARACTER_DIMENSIONS: Readonly<Dimensions> = {
    width: 2,
    height: 2,
};

export class Character implements GameObject {
    ai: Ai | null;
    rank: number = 0;
    finished: boolean = false;
    eliminated: boolean = false;

    // Makes walk animations between characters go out of sync.
    private timeOffset = random(2000);

    private direction: Vector = ZERO_VECTOR;
    private latestDirection: Vector = { x: 0, y: -1 };

    private color: string;

    x: number = 0;
    y: number = 0;
    width: number;
    height: number;

    velocity: Vector = ZERO_VECTOR;

    fallStartTime: number | undefined;

    latestCheckpointIndex: number = 0;

    constructor(
        id: number,
        track: Track | undefined,
        wOffset = 1 + Math.random() * 0.6,
        hOffset = 1 + Math.random() * 0.4,
    ) {
        this.ai = id === 0 || !track ? null : new Ai(this, track);
        this.color = 0 <= id && id < colors.length ? colors[id] : "black";
        this.width = CHARACTER_DIMENSIONS.width * wOffset;
        this.height = CHARACTER_DIMENSIONS.height * hOffset;
    }

    setDirection(direction: Vector): void {
        this.direction = direction;
        if (!isZero(direction)) {
            this.latestDirection = direction;
        }
    }

    getMovement(t: number, dt: number): Vector {
        if (!this.ai) {
            // Player
            const keys = getKeys();

            const left = keys.ArrowLeft || keys.KeyA;
            const right = keys.ArrowRight || keys.KeyD;
            const up = keys.ArrowUp || keys.KeyW;
            const down = keys.ArrowDown || keys.KeyS;

            const dx = left ? -1 : right ? 1 : 0;
            const dy = up ? -1 : down ? 1 : 0;

            if (dx === 0 && dy === 0) {
                return ZERO_VECTOR;
            }

            return normalize({
                x: dx,
                y: dy,
            });
        }

        return this.ai.getMovement(t, dt);
    }

    move(): void {
        if (this.eliminated || this.finished) {
            this.direction = ZERO_VECTOR;
            this.velocity = ZERO_VECTOR;
        } else {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
        }
    }

    stop(): void {
        // Move character after finishing a little
        this.y += this.velocity.y * 8;
    }

    drop(position: Vector): void {
        this.x = position.x;
        this.y = position.y;
        this.direction = ZERO_VECTOR;
        this.latestDirection = { x: 0, y: -1 };
        this.velocity = ZERO_VECTOR;
        this.fallStartTime = undefined;
        this.ai?.reset();
    }

    // eslint-disable-next-line
    draw(t: number, _: number): void {
        const direction: CharacterFacingDirection =
            this.latestDirection.y !== 0
                ? this.latestDirection.x === 0
                    ? this.latestDirection.y < 0
                        ? CharacterFacingDirection.Forward
                        : CharacterFacingDirection.Backward
                    : this.latestDirection.y > 0
                      ? CharacterFacingDirection.BackwardRight
                      : CharacterFacingDirection.ForwardRight
                : CharacterFacingDirection.Right;

        cx.save();

        // Debug border
        // cx.save();
        // cx.strokeStyle = "red";
        // cx.lineWidth = 0.1;
        // cx.strokeRect(this.x, this.y, this.width, this.height);
        // cx.restore();

        // Debug target
        // if (this.ai?.target) {
        //     cx.save();
        //     cx.fillStyle = this.color;
        //     cx.fillRect(
        //         this.ai.target.x,
        //         this.ai.target.y,
        //         this.ai.target.width,
        //         this.ai.target.height,
        //     );
        //     cx.restore();
        // }

        // TODO: This fixes some colors seeing as black
        colors.forEach((color) => {
            cx.fillStyle = color;
        });

        // Different render height than actual height, for pseudo-3d effect.
        const renderHeight = this.height * 3;
        const heightDiff = renderHeight - this.height;

        cx.translate(this.x, this.y - heightDiff);

        if (this.latestDirection.x < 0) {
            mirrorHorizontally(cx, this.width);
        }

        if (this.fallStartTime != null) {
            // Draw smaller as the character falls down.
            const sizeRatio = Math.max(
                1 - easeInQuad((t - this.fallStartTime) / FALL_TIME),
                0,
            );
            cx.translate(this.width / 2, renderHeight / 2);
            cx.scale(sizeRatio, sizeRatio);
            cx.translate(-this.width / 2, -renderHeight / 2);
        }

        const animationTime =
            isZero(this.direction) && this.fallStartTime == null
                ? 0
                : t + this.timeOffset;

        renderCharacter(
            cx,
            this.eliminated ? "rgba(128,128,128,0.8" : this.color,
            this.width,
            renderHeight,
            animationTime,
            this.finished ? CharacterFacingDirection.Backward : direction,
            this.getAnimation(),
        );
        cx.restore();
    }

    private getAnimation(): CharacterAnimation {
        if (this.fallStartTime != null) {
            return CharacterAnimation.Fall;
        }

        if (!isZero(this.direction)) {
            return CharacterAnimation.Walk;
        }

        return CharacterAnimation.Stand;
    }
}
