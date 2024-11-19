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
import { Track } from "./Track";
import { Block, BLOCK_COUNT, BLOCK_WIDTH, BlockType } from "./TrackElement";
import { normalize, Vector, ZERO_VECTOR } from "./Vector";

const FORWARD: Vector = { x: 0, y: -1 };
const DIAGONAL_LEFT: Vector = normalize({ x: -1, y: -1 });
const DIAGONAL_RIGHT: Vector = normalize({ x: 1, y: -1 });

/*
 * How many blocks the AI can see ahead.
 */
const VISIBILITY_BLOCK_COUNT = 3;

const SLOWDOWN_TIME = 1000;

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

    /*
     * Remember the latest time when slowing down so that the character
     * would not flicker between going and not going.
     */
    private lastSlowdownTime: number = -SLOWDOWN_TIME;

    currentTarget: Block | null = null;

    constructor(host: GameObject, track: Track) {
        this.host = host;
        this.track = track;
    }

    reset(): void {
        this.currentTarget = null;
    }

    getMovement(t: number, dt: number): Vector {
        const currentBlock = this.getCurrentBlock();

        let movement = this.goByRaft(currentBlock, t, dt);
        if (movement) {
            return movement;
        }

        if (this.currentTarget == null || this.hasReached(this.currentTarget)) {
            const nextTarget = this.findNextTarget(currentBlock);

            if (nextTarget == null) {
                return ZERO_VECTOR;
            }

            this.currentTarget = nextTarget;
        }

        movement = this.goRoundObstacles(
            this.currentTarget,
            currentBlock,
            t,
            dt,
        );
        if (movement) {
            return movement;
        }

        return this.moveOnTrack(this.currentTarget, currentBlock, t, dt);
    }

    private goByRaft(
        currentBlock: Block,
        t: number,
        dt: number,
    ): Vector | null {
        if (
            currentBlock.type !== BlockType.Raft &&
            this.track.getBlock(currentBlock.row + 1, currentBlock.col).type ===
                BlockType.Raft &&
            (this.host.y > currentBlock.y + 1.5 * this.host.height ||
                this.track.isFree(currentBlock.row + 1, currentBlock.col))
        ) {
            // Step into the raft
            return {
                x: 0,
                y: this.moveAhead(currentBlock, t, dt),
            };
        }

        if (
            this.host.y <= currentBlock.y + 1.5 * this.host.height &&
            this.track.getBlock(currentBlock.row + 1, currentBlock.col).type ===
                BlockType.Raft &&
            !this.track.isFree(currentBlock.row + 1, currentBlock.col)
        ) {
            // Wait for the raft to arrive
            return ZERO_VECTOR;
        }

        if (
            currentBlock.type === BlockType.Raft &&
            !this.track.isFree(currentBlock.row + 1, currentBlock.col)
        ) {
            // Waiting for the raft to reach destination
            return ZERO_VECTOR;
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
        target: Block,
        currentBlock: Block,
        t: number,
        dt: number,
    ): Vector | null {
        if (currentBlock.type === BlockType.Obstacle) {
            if (
                currentBlock.y + currentBlock.height / 2 <
                this.host.y + this.host.height / 2
            ) {
                // Behind the obstacle
                if (target.col < currentBlock.col) {
                    return DIAGONAL_LEFT;
                } else {
                    return DIAGONAL_RIGHT;
                }
            }
        } else if (
            target.col < currentBlock.col &&
            this.track.getBlock(currentBlock.row, currentBlock.col - 1).type ===
                BlockType.Obstacle
        ) {
            if (this.host.y > currentBlock.y + 3 * this.host.height) {
                const vertical = this.moveAhead(currentBlock, t, dt);
                return { x: 0, y: vertical };
            } else {
                return DIAGONAL_LEFT;
            }
        } else if (
            currentBlock.col < target.col &&
            this.track.getBlock(currentBlock.row, currentBlock.col + 1).type ===
                BlockType.Obstacle
        ) {
            if (this.host.y > currentBlock.y + 3 * this.host.height) {
                const vertical = this.moveAhead(currentBlock, t, dt);
                return { x: 0, y: vertical };
            } else {
                return DIAGONAL_RIGHT;
            }
        }

        return null;
    }

    private moveOnTrack(
        target: Block,
        currentBlock: Block,
        t: number,
        dt: number,
    ): Vector {
        const isLeftFromTarget: boolean =
            this.host.x < target.x + this.horizontalMargin;
        const isRightFromTarget: boolean =
            target.x + target.width - this.horizontalMargin <=
            this.host.x + this.host.width;

        let verticalMovement = 0;
        let horizontalMovement = 0;

        if (
            this.track.getBlock(currentBlock.row + 1, currentBlock.col).type ===
                BlockType.Empty &&
            this.host.y + this.host.height / 2 < currentBlock.y
        ) {
            // Back off if going over the edge
            verticalMovement = 1;
        } else {
            verticalMovement = this.moveAhead(currentBlock, t, dt);
        }

        if (
            verticalMovement < 0 &&
            this.track.getBlock(currentBlock.row + 1, currentBlock.col).type ===
                BlockType.Empty &&
            this.host.y + this.host.height / 2 <
                currentBlock.y + currentBlock.height / 2
        ) {
            // A chasm ahead, don't move forward
            verticalMovement = 0;
        }

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

    private moveAhead(currentBlock: Block, t: number, dt: number): number {
        if (
            this.host.velocity.y < -(CHARACTER_MAX_RUN_SPEED * dt) * 2 &&
            this.track.getBlock(currentBlock.row + 1, currentBlock.col).type !==
                BlockType.Free
        ) {
            // Slow down
            return 1;
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
            // Full steam ahead
            return -1;
        }

        return 0;
    }

    private getCurrentBlock(): Block {
        const pos: Vector = getCenter(this.host);

        let block = this.track.getBlockAt(pos);

        // Check if the player is a little bit over the edge in y
        // direction and adjust the block to what it "should" be.
        if (
            block.type === BlockType.Empty &&
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
        const target = this.findNearestBlock(
            currentBlock.row + 1,
            currentBlock.col,
        );

        if (target == null || target.col !== currentBlock.col) {
            return target;
        }

        const blockFurtherAway = this.findNearestBlock(
            target.row + 1,
            target.col,
        );

        if (blockFurtherAway == null) {
            return target;
        }

        if (blockFurtherAway.col < target.col) {
            const adjustedTarget = this.track.getBlock(
                target.row,
                target.col - 1,
            );
            if (adjustedTarget.type === BlockType.Free) {
                return adjustedTarget;
            }
        }

        if (target.col < blockFurtherAway.col) {
            const adjustedTarget = this.track.getBlock(
                target.row,
                target.col + 1,
            );
            if (adjustedTarget.type === BlockType.Free) {
                return adjustedTarget;
            }
        }

        return target;
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
