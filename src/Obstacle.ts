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

import { GameObject } from "./GameObject";
import { cx } from "./graphics";
import { Vector, ZERO_VECTOR } from "./Vector";

export class Obstacle implements GameObject {
    static WIDTH = 10;
    static HEIGHT = 4;

    x: number;
    y: number;
    width: number = Obstacle.WIDTH;
    height: number = Obstacle.HEIGHT;

    velocity: Vector = ZERO_VECTOR;

    constructor(position: Vector) {
        this.x = position.x;
        this.y = position.y;
    }

    // eslint-disable-next-line
    draw(_t: number, _dt: number): void {
        cx.save();
        cx.translate(this.x, this.y);

        // Debug border
        // cx.strokeStyle = "red";
        // cx.lineWidth = 0.1;
        // cx.strokeRect(0, 0, this.width, this.height);

        const bodyGradient = cx.createLinearGradient(
            0,
            0,
            this.width,
            this.height,
        );
        bodyGradient.addColorStop(0, "rgb(255, 110, 110)");
        bodyGradient.addColorStop(1, "rgb(255, 60, 60)");

        // Bottom ellipse
        cx.fillStyle = bodyGradient;
        cx.beginPath();
        cx.ellipse(
            this.width / 2,
            this.height / 2,
            this.width / 2,
            this.height / 2,
            0,
            0,
            2 * Math.PI,
        );
        cx.shadowOffsetY = this.height * 4;
        cx.shadowBlur = this.height;
        cx.shadowColor = "rgba(0, 0, 0, 0.1)";
        cx.fill();

        cx.shadowOffsetY = 0;
        cx.shadowBlur = 0;
        cx.fillRect(0, -this.height * 2, this.width, this.height * 2.5);
        const gradient = cx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, "rgb(255, 140, 140)");
        gradient.addColorStop(1, "rgb(255, 80, 80)");
        cx.fillStyle = gradient;

        // Top ellipse
        cx.beginPath();
        cx.ellipse(
            this.width / 2,
            -this.height * 2,
            this.width / 2,
            this.height / 2,
            0,
            0,
            2 * Math.PI,
        );
        cx.fill();

        cx.strokeStyle = "rgb(200, 70, 70)";
        cx.lineWidth = this.width / 100; // Adjust the width of the outline as needed
        cx.stroke();

        cx.restore();
    }
}
