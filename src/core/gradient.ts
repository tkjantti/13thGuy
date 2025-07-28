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

let gradient: CanvasGradient;

const createGradient = (
    canvas: HTMLCanvasElement,
    cx: CanvasRenderingContext2D,
): CanvasGradient => {
    const width = canvas.width;
    const height = canvas.height;

    const result = cx.createRadialGradient(
        width / 2,
        height / 2,
        0, // Inner circle
        width / 2,
        height / 2,
        width / 2, // Outer circle
    );

    result.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    result.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    return result;
};

export const renderGradient = (
    canvas: HTMLCanvasElement,
    cx: CanvasRenderingContext2D,
) => {
    if (!gradient) {
        gradient = createGradient(canvas, cx);
    }
    cx.fillStyle = gradient;
    cx.fillRect(0, 0, canvas.width, canvas.height);
};
