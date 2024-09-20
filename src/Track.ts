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

import { Area, overlap } from "./Area";
import { GameObject } from "./GameObject";
import {
    BLOCK_WIDTH,
    BlockType,
    createTrack,
    ELEMENT_HEIGHT,
    isRaft,
    isSlope,
    LEFTMOST_EDGE,
    TrackElement,
    TrackElementType,
    TT,
} from "./TrackElement";
import { add, Vector } from "./Vector";

const RAFT_SPEED = 0.005;
const RAFT_DOCK_TIME = 2000;

export interface IndexRange {
    minI: number;
    maxI: number;
}

interface Checkpoint {
    element: TrackElement;
    y: number;
}

export interface Block extends Area {
    row: number;
    col: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export class Track {
    private elements: TrackElement[];
    private startY: number;
    private checkpoints: Checkpoint[];

    // Optimization: no need to loop every element in every frame.
    private specialElements: TrackElement[];

    readonly finishY: number;

    readonly elementCount: number;

    readonly width: number;
    readonly height: number;

    constructor(templates: readonly TT[], startY: number) {
        this.elements = createTrack(templates, startY);
        this.elementCount = this.elements.length;

        this.specialElements = this.elements.filter((e) =>
            e.surfaces.some((s) => isSlope(s) || isRaft(s)),
        );

        this.startY = startY;
        this.finishY =
            this.startY - (this.elements.length - 1) * ELEMENT_HEIGHT;

        const minX = Math.min(...this.elements.map((e) => e.minX));
        const maxX = Math.max(...this.elements.map((e) => e.maxX));

        this.width = maxX - minX;
        this.height = this.elements.length * ELEMENT_HEIGHT;

        this.checkpoints = this.elements
            // Include start element in checkpoints
            .filter((e, i) => e.type === TrackElementType.CheckPoint || i === 0)
            .map((e) => ({
                y: e.y + e.height,
                element: e,
            }));
    }

    update(t: number, dt: number, objects: readonly GameObject[]): void {
        for (let ei = 0; ei < this.specialElements.length; ei++) {
            const element = this.specialElements[ei];

            for (let si = 0; si < element.surfaces.length; si++) {
                const surface = element.surfaces[si];

                if (isSlope(surface)) {
                    for (let oi = 0; oi < objects.length; oi++) {
                        const o = objects[oi];
                        if (
                            surface.y <= o.y &&
                            o.y + o.height < surface.y + surface.height &&
                            surface.x <= o.x &&
                            o.x + o.width <= surface.x + surface.width
                        ) {
                            o.velocity = add(o.velocity, {
                                x: 0,
                                y: -0.002 * surface.force * dt,
                            });
                        }
                    }
                }

                if (isRaft(surface)) {
                    const raft = surface;
                    const yStart = element.y;
                    const yEnd = element.y - ELEMENT_HEIGHT;

                    if (raft.yDirection === -1 && raft.y <= yEnd) {
                        raft.yDirection = 0;
                        raft.dockStartTime = t;
                    } else if (
                        raft.y <= yEnd &&
                        t - raft.dockStartTime > RAFT_DOCK_TIME
                    ) {
                        raft.yDirection = 1;
                    } else if (raft.yDirection === 1 && yStart <= raft.y) {
                        raft.yDirection = 0;
                        raft.dockStartTime = t;
                    } else if (
                        yStart <= raft.y &&
                        t - raft.dockStartTime > RAFT_DOCK_TIME
                    ) {
                        raft.yDirection = -1;
                    }

                    const yMovement = raft.yDirection * RAFT_SPEED * dt;

                    raft.y += yMovement;

                    // Move objects along with the raft
                    for (let oi = 0; oi < objects.length; oi++) {
                        const o = objects[oi];
                        if (overlap(raft, o)) {
                            o.y += yMovement;
                        }
                    }
                }
            }
        }
    }

    get(i: number): TrackElement {
        return this.elements[i];
    }

    getBlockType(row: number, col: number): BlockType {
        if (row < 0 || this.elements.length <= row) {
            return BlockType.Empty;
        }

        const element = this.elements[row];
        return element.getBlockType(col);
    }

    isFree(row: number, col: number): boolean {
        if (row < 0 || this.elements.length <= row) {
            return false;
        }
        const element = this.elements[row];

        if (element.surfaces.some((s) => isRaft(s))) {
            element.calculateBlocks();
        }

        // Check if a raft is over chasm.
        if (element.surfaces.length === 0) {
            const previousElement = this.elements[Math.max(row - 1, 0)];
            return previousElement.isFree(element.y, col);
        }

        return !!element.blocks[col];
    }

    getBlock(row: number, col: number): Block {
        const element = this.elements[row];

        return {
            row,
            col,
            x: LEFTMOST_EDGE + col * BLOCK_WIDTH,
            y: element.y,
            width: BLOCK_WIDTH,
            height: ELEMENT_HEIGHT,
        };
    }

    getBlockAt(position: Vector): Block {
        const elementCount = Math.floor(
            Math.max(this.startY - position.y, 0) / ELEMENT_HEIGHT,
        );

        const row = Math.min(elementCount, this.elements.length - 1);
        const col = Math.floor((position.x - LEFTMOST_EDGE) / BLOCK_WIDTH);

        return this.getBlock(row, col);
    }

    getCheckpoint(checkpointIndex: number): TrackElement {
        return this.checkpoints[checkpointIndex].element;
    }

    findLatestCheckpoint(y: number): number {
        for (let i = this.checkpoints.length - 1; i >= 0; i--) {
            const checkpoint = this.checkpoints[i];
            if (y < checkpoint.y - checkpoint.element.height * 0.15) {
                return i;
            }
        }

        return 0;
    }

    getBetween(topY: number, bottomY: number): IndexRange {
        const countOfElementsToTopY = Math.ceil(
            Math.max(this.startY - topY, 0) / ELEMENT_HEIGHT,
        );
        const countOfElementsToBottomY = Math.floor(
            Math.max(this.startY - bottomY, 0) / ELEMENT_HEIGHT,
        );

        return {
            minI: Math.max(countOfElementsToBottomY - 1, 0),
            maxI: Math.min(countOfElementsToTopY, this.elements.length) - 1,
        };
    }

    isOnPlatform(range: IndexRange, area: Area): boolean {
        const { minI, maxI } = range;

        for (let e = maxI; e >= minI; e--) {
            const element = this.get(e);
            const surfaces = element.surfaces;

            for (let i = 0; i < surfaces.length; i++) {
                const surface = surfaces[i];

                if (overlap(area, surface)) {
                    return true;
                }
            }
        }

        return false;
    }
}
