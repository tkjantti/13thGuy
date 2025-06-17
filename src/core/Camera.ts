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

import { Area, Dimensions } from "./Area";
import { easeInOutExpo } from "./easings";

export interface Transition {
    startY: number;
    endY: number;
    startTime: number;
    duration: number;
}

export class Camera {
    x = 0;
    y = 0;
    zoom = 1;
    visibleAreaHeight?: number;

    // Adjusts the camera y position, relative to the visible level
    // area.
    yAdjust: number = 0;

    private target: Area | null = null;
    private transition: Transition | null = null;

    constructor(
        private level: Area,
        private view: Dimensions,
    ) {}

    // Returns the area of the level that is currently visible on the
    // camera.
    getViewArea(): Area {
        const viewAreaWidth = this.view.width / this.zoom;
        const viewAreaHeight = this.view.height / this.zoom;

        return {
            x: this.x - viewAreaWidth / 2,
            y: this.y - viewAreaHeight / 2,
            width: viewAreaWidth,
            height: viewAreaHeight,
        };
    }

    follow(target: Area): void {
        this.target = target;
    }

    setTransition(transition: Transition): void {
        const viewAreaHeight = this.view.height / this.zoom;
        this.transition = {
            ...transition,
            endY: transition.endY + viewAreaHeight * this.yAdjust,
        };
        this.target = null;
    }

    update(t: number): void {
        if (this.visibleAreaHeight != null) {
            this.zoom = this.view.height / this.visibleAreaHeight;
        }

        if (this.transition != null) {
            const { startY, endY, startTime, duration } = this.transition;

            if (t < startTime + duration) {
                const elapsedTime = t - this.transition.startTime;
                const progress = elapsedTime / this.transition.duration;

                this.y = startY + easeInOutExpo(progress) * (endY - startY);
            } else {
                this.transition = null;
            }
        } else if (this.target) {
            this.followFrame(this.target);
        }
    }

    private followFrame(gameObject: Area): void {
        const viewAreaWidth = this.view.width / this.zoom;
        const viewAreaHeight = this.view.height / this.zoom;

        if (viewAreaWidth < this.level.width) {
            let x = gameObject.x + gameObject.width;

            // Keep camera within level in x-direction.
            if (x - viewAreaWidth / 2 < this.level.x) {
                x = this.level.x + viewAreaWidth / 2;
            } else if (
                x + viewAreaWidth / 2 >
                this.level.x + this.level.width
            ) {
                x = this.level.x + this.level.width - viewAreaWidth / 2;
            }

            this.x = x;
        } else {
            this.x = 0;
        }

        this.y = gameObject.y + viewAreaHeight * this.yAdjust;
    }
}
