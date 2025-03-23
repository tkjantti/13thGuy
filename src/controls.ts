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

import { Area, includesPoint } from "./Area";
import { canvas, cx } from "./graphics";
import { getKeys, initializeKeyboard } from "./keyboard";
import { getTouchPosition, initializeTouchscreen } from "./touchscreen";
import { normalize, VectorMutable, ZERO_VECTOR } from "./Vector";

export interface Controls {
    movement: VectorMutable;
}

interface Button extends Area {
    readonly symbol: string;
}

let leftButton: Button = { symbol: "◀", x: 0, y: 0, width: 0, height: 0 };
let rightButton: Button = { symbol: "▶", x: 0, y: 0, width: 0, height: 0 };
let upButton: Button = { symbol: "▲", x: 0, y: 0, width: 0, height: 0 };
let downButton: Button = { symbol: "▼", x: 0, y: 0, width: 0, height: 0 };

const controls: Controls = {
    movement: { x: 0, y: 0 },
};

export const updateControls = (): void => {
    const keys = getKeys();
    const touch = getTouchPosition();

    const left =
        keys.ArrowLeft ||
        keys.KeyA ||
        (touch && includesPoint(leftButton, touch));
    const right =
        keys.ArrowRight ||
        keys.KeyD ||
        (touch && includesPoint(rightButton, touch));
    const up =
        keys.ArrowUp || keys.KeyW || (touch && includesPoint(upButton, touch));
    const down =
        keys.ArrowDown ||
        keys.KeyS ||
        (touch && includesPoint(downButton, touch));

    const dx = left ? -1 : right ? 1 : 0;
    const dy = up ? -1 : down ? 1 : 0;

    if (dx === 0 && dy === 0) {
        controls.movement = ZERO_VECTOR;
    } else {
        controls.movement = normalize({
            x: dx,
            y: dy,
        });
    }
};

export const initializeControls = (): void => {
    initializeKeyboard();
    initializeTouchscreen();

    const xMargin = canvas.width * 0.01;
    const yMargin = canvas.height * 0.02;
    const horizontalButtonWidth = canvas.width * 0.1;
    const horizontalButtonHeight = canvas.height * 0.6;
    const verticalButtonWidth = canvas.width * 0.1;
    const verticalButtonHeight = canvas.height * 0.3;

    leftButton.x = 0;
    leftButton.y = 0;
    leftButton.width = horizontalButtonWidth;
    leftButton.height = horizontalButtonHeight;

    rightButton.x = horizontalButtonWidth + xMargin;
    rightButton.y = 0;
    rightButton.width = horizontalButtonWidth;
    rightButton.height = horizontalButtonHeight;

    upButton.x = canvas.width - verticalButtonWidth;
    upButton.y = 0;
    upButton.width = verticalButtonWidth;
    upButton.height = verticalButtonHeight;

    downButton.x = canvas.width - verticalButtonWidth;
    downButton.y = verticalButtonHeight + yMargin;
    downButton.width = verticalButtonWidth;
    downButton.height = verticalButtonHeight;
};

export const renderTouchControls = (): void => {
    cx.save();
    const symbolWidth = leftButton.width / 2;
    cx.font = symbolWidth + "px Impact";
    cx.fillStyle = "rgba(200, 200, 200, 0.2)";
    renderButton(leftButton, symbolWidth);
    renderButton(rightButton, symbolWidth);
    renderButton(upButton, symbolWidth);
    renderButton(downButton, symbolWidth);
    cx.restore();
};

export const renderButton = (button: Button, symbolWidth: number): void => {
    cx.fillRect(button.x, button.y, button.width, button.height);
    cx.fillText(
        button.symbol,
        button.x + button.width / 2 - symbolWidth / 2,
        button.y + button.height / 2 + symbolWidth * 0.25,
        symbolWidth,
    );
};

export const getControls = (): Controls => {
    return controls;
};
