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
import { Block, BLOCK_COUNT, BLOCK_WIDTH, BlockType } from "./TrackElement";
import { Map } from "./Map";
import { normalize, Vector, ZERO_VECTOR } from "./Vector";

const VERTICAL_FORWARD = -1;
const VERTICAL_BACKWARD = 1;

const FORWARD: Vector = { x: 0, y: VERTICAL_FORWARD };
const LEFT: Vector = { x: -1, y: 0 };
const RIGHT: Vector = { x: 1, y: 0 };
const DIAGONAL_LEFT: Vector = normalize({ x: -1, y: VERTICAL_FORWARD });
const DIAGONAL_RIGHT: Vector = normalize({ x: 1, y: VERTICAL_FORWARD });

/*
 * How many blocks the AI can see ahead.
 */
const VISIBILITY_BLOCK_COUNT = 3;

const SLOWDOWN_TIME = 1000;

export class Ai {
    private host: GameObject;
    private track: Map;

    /*
     * Randomized every now and then. Not useful for an individual
     * character, but makes it looks a bit more interesting when all
     * the characters don't go exactly the
     * same path.
     */
    private horizontalMargin: number = 0;

    /*
     * Remember the latest time when slowing down so that the character
     * would not flicker between going and not going.
     */
    private lastSlowdownTime: number = -SLOWDOWN_TIME;

    target: Block | null = null;

    constructor(host: GameObject, track: Map) {
        this.host = host;
        this.track = track;
    }

    reset(): void {
        this.target = null;
    }

    getMovement(t: number, dt: number): Vector {
        const currentBlock = this.getCurrentBlock();
        const nextBlock = this.track.getBlock(
            currentBlock.row + 1,
            currentBlock.col,
        );

        const movement = this.goByRaft(currentBlock, nextBlock, t, dt);
        if (movement) {
            return movement;
        }

        if (this.target == null || this.hasReached(this.target)) {
            this.target = this.findNextTarget(currentBlock);
        }

        return (
            this.goRoundObstacles(currentBlock, nextBlock, t, dt) ||
            this.moveOnTrack(currentBlock, nextBlock, t, dt)
        );
    }

    private goByRaft(
        currentBlock: Block,
        nextBlock: Block,
        t: number,
        dt: number,
    ): Vector | null {
        if (
            currentBlock.type !== BlockType.Raft &&
            nextBlock.type === BlockType.Raft &&
            (this.host.y > currentBlock.y + 1.5 * this.host.height ||
                this.track.isFree(currentBlock.row + 1, currentBlock.col))
        ) {
            // Step into the raft
            return {
                x: 0,
                y: this.moveAhead(currentBlock, nextBlock, t, dt),
            };
        }

        if (
            nextBlock.type === BlockType.Raft &&
            this.host.y <= currentBlock.y + 1.5 * this.host.height &&
            !this.track.isFree(currentBlock.row + 1, currentBlock.col)
        ) {
            // Wait for the raft to arrive
            return ZERO_VECTOR;
        }

        if (
            currentBlock.type === BlockType.Raft &&
            !this.track.isFree(currentBlock.row + 1, currentBlock.col)
        ) {
            // Stay off from the edges horizontally
            let horizontal = 0;
            if (this.host.x < currentBlock.x + this.host.width) {
                horizontal = 1;
            } else if (
                currentBlock.x + currentBlock.width - 2 * this.host.width <
                this.host.x
            ) {
                horizontal = -1;
            }

            // Waiting for the raft to reach destination
            const vertical = 0;

            return { x: horizontal, y: vertical };
        }

        if (
            currentBlock.type === BlockType.Raft &&
            this.track.isFree(currentBlock.row, currentBlock.col) &&
            this.track.isFree(currentBlock.row + 1, currentBlock.col)
        ) {
            // Step out of the raft
            return FORWARD;
        }

        return null;
    }

    private goRoundObstacles(
        currentBlock: Block,
        nextBlock: Block,
        t: number,
        dt: number,
    ): Vector | null {
        if (this.target == null) {
            return ZERO_VECTOR;
        }

        if (currentBlock.type === BlockType.Obstacle) {
            if (
                currentBlock.y + currentBlock.height / 2 <
                this.host.y + this.host.height / 2
            ) {
                // Behind the obstacle
                if (this.target.col < currentBlock.col) {
                    return DIAGONAL_LEFT;
                } else {
                    return DIAGONAL_RIGHT;
                }
            }
        } else if (
            this.target.col < currentBlock.col &&
            this.track.getBlock(currentBlock.row, currentBlock.col - 1).type ===
                BlockType.Obstacle
        ) {
            if (this.host.y > currentBlock.y + 3 * this.host.height) {
                // go past the obstacle
                const vertical = this.moveAhead(currentBlock, nextBlock, t, dt);
                return { x: 0, y: vertical };
            } else if (nextBlock.type === BlockType.Empty) {
                // go past the obstacle horizontally
                return LEFT;
            } else {
                // go past the obstacle diagonally
                const vertical = this.moveAhead(currentBlock, nextBlock, t, dt);
                return { x: -1, y: vertical };
            }
        } else if (
            currentBlock.col < this.target.col &&
            this.track.getBlock(currentBlock.row, currentBlock.col + 1).type ===
                BlockType.Obstacle
        ) {
            if (this.host.y > currentBlock.y + 3 * this.host.height) {
                // go past the obstacle
                const vertical = this.moveAhead(currentBlock, nextBlock, t, dt);
                return { x: 0, y: vertical };
            } else if (nextBlock.type === BlockType.Empty) {
                // go past the obstacle horizontally
                return RIGHT;
            } else {
                // go past the obstacle diagonally
                const vertical = this.moveAhead(currentBlock, nextBlock, t, dt);
                return { x: 1, y: vertical };
            }
        }

        return null;
    }

    private moveOnTrack(
        currentBlock: Block,
        nextBlock: Block,
        t: number,
        dt: number,
    ): Vector {
        if (this.target == null) {
            return ZERO_VECTOR;
        }

        let verticalMovement = 0;

        if (
            nextBlock.type === BlockType.Empty &&
            this.host.y + this.host.height / 2 < currentBlock.y
        ) {
            // Back off if going over the edge
            verticalMovement = VERTICAL_BACKWARD;
        } else {
            verticalMovement = this.moveAhead(currentBlock, nextBlock, t, dt);
        }

        if (
            verticalMovement < 0 &&
            nextBlock.type === BlockType.Empty &&
            this.host.y + this.host.height / 2 <
                currentBlock.y + currentBlock.height / 2
        ) {
            // A chasm ahead, don't move forward
            verticalMovement = 0;
        }

        let horizontalMovement = 0;

        const isLeftFromTarget: boolean =
            this.host.x < this.target.x + this.horizontalMargin;
        const isRightFromTarget: boolean =
            this.target.x + this.target.width - this.horizontalMargin <=
            this.host.x + this.host.width;

        if (
            isLeftFromTarget &&
            this.track.getBlock(currentBlock.row, currentBlock.col + 1).type ===
                BlockType.Free
        ) {
            horizontalMovement = 1;
        } else if (
            isRightFromTarget &&
            this.track.getBlock(currentBlock.row, currentBlock.col - 1).type ===
                BlockType.Free
        ) {
            horizontalMovement = -1;
        }

        return {
            x: horizontalMovement,
            y: verticalMovement,
        };
    }

    private moveAhead(
        currentBlock: Block,
        nextBlock: Block,
        t: number,
        dt: number,
    ): number {
        if (
            nextBlock.type !== BlockType.Free &&
            this.host.velocity.y < -(CHARACTER_MAX_RUN_SPEED * dt) * 2
        ) {
            // Slow down
            return VERTICAL_BACKWARD;
        } else if (
            this.host.velocity.y < -(CHARACTER_MAX_RUN_SPEED * dt) * 5 &&
            !this.isClearAhead(currentBlock)
        ) {
            // Stop progressing for a little while if going too fast already
            if (SLOWDOWN_TIME < t - this.lastSlowdownTime) {
                this.lastSlowdownTime = t;
            }

            return 0;
        } else if (SLOWDOWN_TIME < t - this.lastSlowdownTime) {
            return VERTICAL_FORWARD;
        }

        return 0;
    }

    private getCurrentBlock(): Block {
        const pos: Vector = getCenter(this.host);

        let block = this.track.getBlockAt(pos);

        // Check if the player is a little bit over the edge in y
        // direction and adjust the block to what it "should" be.
        // Works nicely with the raft logic when about to step into
        // a raft.
        if (
            (block.type === BlockType.Empty || block.type === BlockType.Raft) &&
            block.y + block.height - this.host.height < pos.y
        ) {
            block = this.track.getBlock(block.row - 1, block.col);
        }

        // In the same way, check if over the edge in the x direction
        // and adjust the block accordingly.
        if (block.type === BlockType.Empty) {
            if (block.x + block.width - this.host.width < pos.x) {
                block = this.track.getBlock(block.row, block.col + 1);
            } else if (pos.x < block.x + this.host.width) {
                block = this.track.getBlock(block.row, block.col - 1);
            }
        }

        return block;
    }

    private hasReached(block: Block): boolean {
        return this.host.y + this.host.height < block.y + block.height;
    }

    private findNextTarget(currentBlock: Block): Block | null {
        const nextTarget = this.findNearestBlock(
            currentBlock.row + 1,
            currentBlock.col,
        );

        if (nextTarget == null || nextTarget.col !== currentBlock.col) {
            return nextTarget;
        }

        const blockFurtherAway = this.findNearestBlock(
            nextTarget.row + 1,
            nextTarget.col,
        );

        if (blockFurtherAway == null) {
            return nextTarget;
        }

        if (blockFurtherAway.col < nextTarget.col) {
            const adjustedTarget = this.track.getBlock(
                nextTarget.row,
                nextTarget.col - 1,
            );
            if (adjustedTarget.type === BlockType.Free) {
                return adjustedTarget;
            }
        }

        if (nextTarget.col < blockFurtherAway.col) {
            const adjustedTarget = this.track.getBlock(
                nextTarget.row,
                nextTarget.col + 1,
            );
            if (adjustedTarget.type === BlockType.Free) {
                return adjustedTarget;
            }
        }

        return nextTarget;
    }

    private isClearAhead(currentBlock: Block): boolean {
        for (
            let row = currentBlock.row + 1;
            row <= currentBlock.row + VISIBILITY_BLOCK_COUNT;
            row++
        ) {
            if (
                this.track.getBlock(row, currentBlock.col).type !==
                BlockType.Free
            ) {
                return false;
            }
        }

        return true;
    }

    private findNearestBlock(row: number, col: number): Block | null {
        for (let i = 0; i < BLOCK_COUNT - 1; i++) {
            const diff = (random() < 0.5 ? -1 : 1) * i;
            const actualCol = col + diff;

            const block = this.track.getBlock(row, actualCol);

            if (
                block.type === BlockType.Free ||
                block.type === BlockType.Raft
            ) {
                this.horizontalMargin = random(0.2) * BLOCK_WIDTH;
                return this.track.getBlock(row, actualCol);
            }
        }

        return null;
    }
}
