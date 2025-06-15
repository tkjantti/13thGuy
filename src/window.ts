/*
 * Copyright (c) 2025 Tero Jäntti, Sami Heikkinen
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

import { canvas } from "./graphics";
import { VectorMutable } from "./core/Vector";

let canvasScale = 1;

export const resizeCanvasMaintainingAspectRatio = (
    maxWidth: number,
    maxHeight: number,
): void => {
    // Calculate the aspect ratio
    const aspectRatio = maxWidth / maxHeight;

    // Calculate the width and height based on the window size while maintaining the aspect ratio
    let width = window.innerWidth;
    let height = window.innerHeight;

    if (width / height > aspectRatio) {
        width = height * aspectRatio;
    } else {
        height = width / aspectRatio;
    }

    // Ensure the width and height do not exceed the maximum resolution
    if (width > maxWidth) {
        width = maxWidth;
        height = maxWidth / aspectRatio;
    }
    if (height > maxHeight) {
        height = maxHeight;
        width = maxHeight * aspectRatio;
    }

    // Set the canvas width and height
    canvas.width = width;
    canvas.height = height;

    // Calculate the scale factor to fill the screen
    const scaleX = window.innerWidth / width;
    const scaleY = window.innerHeight / height;
    const scale = Math.min(scaleX, scaleY);

    canvasScale = scale;

    // Center the canvas
    canvas.style.position = "absolute";
    canvas.style.left = `${(window.innerWidth - width * scale) / 2}px`;
    canvas.style.top = `${(window.innerHeight - height * scale) / 2}px`;

    // Apply the scaling
    canvas.style.transform = `scale(${scale})`;
    canvas.style.transformOrigin = "top left";
};

export const setCanvasPositionFromScreenPosition = (
    target: VectorMutable,
    touch: Touch,
): void => {
    const offset = canvas.getBoundingClientRect();
    target.x = (touch.clientX - offset.left) / canvasScale;
    target.y = (touch.clientY - offset.top) / canvasScale;
};
