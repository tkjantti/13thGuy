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
    yAdjust = 0, // Y position in relative "rem" units
    centerY = true,
    xAdjust = 0,
    referenceText?: string, // Text size is taken from this text
) => {
    cx.save();
    const fontSize = scaleFontSize(textSize);
    const remUnitSize = scaleFontSize(TextSize.Tiny);
    cx.globalAlpha = alpha > 0 ? alpha : 0;
    cx.fillStyle = "white";
    cx.font = fontSize + "px " + fontName;
    const textWidth = cx.measureText(referenceText ?? text).width;
    const yAdjustAbsolute = yAdjust * remUnitSize;
    const xAdjustAbsolute = xAdjust * remUnitSize;

    cx.fillText(
        text,
        (canvas.width - textWidth) / 2 + xAdjustAbsolute,
        (centerY ? canvas.height / 2 : 0) + yAdjustAbsolute,
    );

    cx.restore();
};
