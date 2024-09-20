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

import { getCenter } from "./Area";
import { GameObject } from "./GameObject";
import { CHARACTER_MAX_RUN_SPEED } from "./physics";
import { random } from "./random";
import { Block, Track } from "./Track";
import {
    BLOCK_COUNT,
    BLOCK_HEIGHT,
    BLOCK_WIDTH,
    BlockType,
} from "./TrackElement";
import { normalize, Vector, ZERO_VECTOR } from "./Vector";

function isWalkableToSomeExtent(t: BlockType): boolean {
    return (
        t === BlockType.Free || t === BlockType.Obstacle || t === BlockType.Raft
    );
}

/*
 * Margin to keep ai from going too close to the edge so that it
 * wouldn't fall too easily.
 * If too much, then ai may have trouble going around obstacles.
 */
const Y_MARGIN = 0.3 * BLOCK_HEIGHT;

const FORWARD: Vector = { x: 0, y: -1 };
const LEFT: Vector = { x: -1, y: 0 };
const RIGHT: Vector = { x: 1, y: 0 };
const DIAGONAL_LEFT: Vector = normalize({ x: -1, y: -1 });
const DIAGONAL_RIGHT: Vector = normalize({ x: 1, y: -1 });

/*
 * How many blocks to see forward for going full speed.
 */
const VISIBILITY_BLOCK_COUNT = 3;

export class Ai {
    private host: GameObject;
    private track: Track;

    /*
     * Randomized every now and then. Not useful for an individual
     * character, but makes it looks a bit more interesting when all
     * the characters don't go exactly the
     * same path.
     */
    private horizontalMargin: number = 0;

    target: Block | null = null;

    constructor(host: GameObject, track: Track) {
        this.host = host;
        this.track = track;
    }

    reset(): void {
        this.target = null;
    }

    getMovement(_: number, dt: number): Vector {
        const pos: Vector = getCenter(this.host);
        const currentBlock = this.track.getBlockAt(pos);

        if (this.target == null) {
            const nextTarget = this.findNextTarget(currentBlock);

            if (nextTarget == null) {
                return ZERO_VECTOR;
            }

            this.target = nextTarget;
            return ZERO_VECTOR;
        }

        const isLessThanHalfwayInCurrentBlock: boolean =
            this.host.y > currentBlock.y + currentBlock.height / 2;
        const isAtTheEndOfCurrentBlock: boolean =
            this.host.y <= currentBlock.y + Y_MARGIN;

        const isLeftFromTarget: boolean =
            this.host.x < this.target.x + this.horizontalMargin;
        const isRightFromTarget: boolean =
            this.target.x + this.target.width - this.horizontalMargin <=
            this.host.x + this.host.width;

        const isBehindTarget: boolean =
            this.host.y > this.target.y + this.target.height;
        const hasReachedTarget: boolean =
            this.host.y + this.host.height < this.target.y + this.target.height;
        const isBehindEndOfTarget: boolean =
            this.host.y > this.target.y + Y_MARGIN;

        const currentBlockType = this.track.getBlockType(
            currentBlock.row,
            currentBlock.col,
        );

        if (hasReachedTarget && currentBlockType !== BlockType.Raft) {
            const oldTarget = this.target;
            const nextTarget = this.findNextTarget(oldTarget);

            if (nextTarget == null) {
                return ZERO_VECTOR;
            }

            this.target = nextTarget;
            return ZERO_VECTOR;
        }

        if (
            isLeftFromTarget &&
            isBehindTarget &&
            isLessThanHalfwayInCurrentBlock &&
            this.track.isFree(currentBlock.row, currentBlock.col + 1)
        ) {
            return DIAGONAL_RIGHT;
        } else if (
            isRightFromTarget &&
            isBehindTarget &&
            isLessThanHalfwayInCurrentBlock &&
            this.track.isFree(currentBlock.row, currentBlock.col - 1)
        ) {
            return DIAGONAL_LEFT;
        } else if (
            isLeftFromTarget &&
            isAtTheEndOfCurrentBlock &&
            isWalkableToSomeExtent(
                this.track.getBlockType(currentBlock.row, currentBlock.col + 1),
            )
        ) {
            return RIGHT;
        } else if (
            isRightFromTarget &&
            isAtTheEndOfCurrentBlock &&
            isWalkableToSomeExtent(
                this.track.getBlockType(currentBlock.row, currentBlock.col - 1),
            )
        ) {
            return LEFT;
        } else if (isBehindTarget) {
            if (
                currentBlockType === BlockType.Empty &&
                !this.track.isFree(currentBlock.row, currentBlock.col)
            ) {
                // Waiting for a raft to reach destination
                return ZERO_VECTOR;
            }

            return this.isClearAhead(currentBlock) ||
                !this.goingFullSpeedAlready(dt)
                ? FORWARD
                : ZERO_VECTOR;
        } else if (isBehindEndOfTarget) {
            if (!this.track.isFree(this.target.row, this.target.col)) {
                // Waiting for a raft to arrive
                return ZERO_VECTOR;
            }

            return this.isClearAhead(currentBlock) ||
                !this.goingFullSpeedAlready(dt)
                ? FORWARD
                : ZERO_VECTOR;
        } else {
            this.target = null;
            return ZERO_VECTOR;
        }
    }

    private isClearAhead(currentBlock: Block): boolean {
        for (
            let row = currentBlock.row + 1;
            row <= currentBlock.row + VISIBILITY_BLOCK_COUNT;
            row++
        ) {
            if (!this.track.isFree(row, currentBlock.col)) {
                return false;
            }
        }

        return true;
    }

    private goingFullSpeedAlready(dt: number): boolean {
        return Math.abs(this.host.velocity.y) > CHARACTER_MAX_RUN_SPEED * dt;
    }

    private findNextTarget(currentBlock: Block): Block | null {
        for (let i = 0; i < BLOCK_COUNT - 1; i++) {
            const diff = (random() < 0.5 ? -1 : 1) * i;
            const row = currentBlock.row + 1;
            const col = currentBlock.col + diff;

            const blockType = this.track.getBlockType(row, col);

            if (blockType === BlockType.Free || blockType === BlockType.Raft) {
                this.horizontalMargin = random(0.2) * BLOCK_WIDTH;
                return this.track.getBlock(row, col);
            }
        }

        return null;
    }
}
