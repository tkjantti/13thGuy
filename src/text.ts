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

import { canvas, cx } from "./graphics";

export enum TextSize {
    Tiny = 16,
    Xs = 20,
    Small = 24,
    Normal = 32,
    Large = 48,
    Xl = 64,
    Huge = 80,
}

const scaleFontSize = (textSize: TextSize): number => {
    const scale = canvas.width / 1000;
    return Math.floor(textSize * scale);
};

export const renderText = (
    text: string,
    textSize: TextSize,
    fontName: string,
    alpha = 1,
    yAdjust = 0, // Relative "rem" units
    centerY = true,
    xAdjust = 0,
    referenceText?: string, // Optional reference text for sizing
    color: string | [string, string] = "white", // One color or a pair for gradient
) => {
    cx.save();

    const fontSize = scaleFontSize(textSize);
    const remUnitSize = scaleFontSize(TextSize.Tiny);
    cx.globalAlpha = Math.max(alpha, 0);
    cx.font = `${fontSize}px ${fontName}`;

    const actualText = referenceText ?? text;
    const metrics = cx.measureText(actualText);
    const ascent = metrics.actualBoundingBoxAscent ?? fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent ?? fontSize * 0.2;

    const textWidth = metrics.width;
    const xAdjustAbsolute = xAdjust * remUnitSize;
    const yAdjustAbsolute = yAdjust * remUnitSize;
    const x = (canvas.width - textWidth) / 2 + xAdjustAbsolute;
    const y = (centerY ? canvas.height / 2 : 0) + yAdjustAbsolute;

    if (Array.isArray(color) && color.length === 2) {
        const top = y - ascent;
        const bottom = y + descent;
        const gradient = cx.createLinearGradient(0, top, 0, bottom);
        gradient.addColorStop(0.2, color[0]);
        gradient.addColorStop(1, color[1]);
        cx.fillStyle = gradient;
    } else {
        cx.fillStyle = color;
    }

    cx.textBaseline = "alphabetic";
    cx.fillText(text, x, y);
    cx.restore();
};
