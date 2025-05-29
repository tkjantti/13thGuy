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

import { Area } from "./Area";
import { canvas, cx } from "./graphics";
import { renderText, TextSize } from "./text";
import { getKeys, initializeKeyboard, waitForEnter } from "./keyboard";
import {
    hasTouchScreen,
    initializeTouchscreen,
    isTouching,
    waitForTap,
    waitForTapAndPlaySound,
} from "./touchscreen";
import { normalize, VectorMutable, ZERO_VECTOR } from "./Vector";

export interface Controls {
    movement: VectorMutable;
}

interface Button extends Area {
    readonly symbol: string;
}

let textAnimationCounter = 0;

const leftButton: Button = { symbol: "◁", x: 0, y: 0, width: 0, height: 0 };
const rightButton: Button = { symbol: "▷", x: 0, y: 0, width: 0, height: 0 };
const upButton: Button = { symbol: "△", x: 0, y: 0, width: 0, height: 0 };
const downButton: Button = { symbol: "▽", x: 0, y: 0, width: 0, height: 0 };

const controls: Controls = {
    movement: { x: 0, y: 0 },
};

export const updateControls = (): void => {
    const keys = getKeys();

    const left = keys.ArrowLeft || keys.KeyA || isTouching(leftButton);
    const right = keys.ArrowRight || keys.KeyD || isTouching(rightButton);
    const up = keys.ArrowUp || keys.KeyW || isTouching(upButton);
    const down = keys.ArrowDown || keys.KeyS || isTouching(downButton);

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
    resizeControls();
    window.addEventListener("resize", resizeControls, false);
};

const resizeControls = (): void => {
    const xMargin = canvas.width * 0.01;
    const yMargin = canvas.height * 0.02;
    const horizontalWidth = canvas.width * 0.1;
    const horizontalHeight = canvas.height * 0.6;
    const top = canvas.height - horizontalHeight * 0.65 - 2 * yMargin;
    const verticalWidth = horizontalWidth;
    const verticalHeight = horizontalHeight / 3;

    leftButton.x = xMargin;
    leftButton.y = top + verticalHeight + yMargin;
    leftButton.width = horizontalWidth;
    leftButton.height = horizontalHeight / 3;

    rightButton.x = horizontalWidth + 2 * xMargin;
    rightButton.y = top + verticalHeight + yMargin;
    rightButton.width = horizontalWidth;
    rightButton.height = horizontalHeight / 3;

    upButton.x = canvas.width - verticalWidth - xMargin;
    upButton.y = top;
    upButton.width = verticalWidth;
    upButton.height = verticalHeight;

    downButton.x = canvas.width - verticalWidth - xMargin;
    downButton.y = top + verticalHeight + yMargin;
    downButton.width = verticalWidth;
    downButton.height = verticalHeight;
};

export const waitForProgressInput = async (
    soundToPlay?: number,
): Promise<void> => {
    await (hasTouchScreen
        ? soundToPlay
            ? waitForTapAndPlaySound(soundToPlay)
            : waitForTap()
        : waitForEnter(soundToPlay));
};

export const renderWaitForProgressInput = (
    action = "continue",
    y = 7.7,
): void => {
    const text =
        (hasTouchScreen ? "Tap the screen to " : "Press ENTER to ") + action;

    renderText(
        text + (textAnimationCounter++ % 60 === 0 ? "" : "█"),
        TextSize.Small,
        "Courier New",
        1,
        y,
        true,
        0,
        text,
    );
};

export const renderTouchControls = (): void => {
    if (!hasTouchScreen) {
        return;
    }

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

const renderButton = (button: Button, symbolWidth: number): void => {
    cx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    cx.lineWidth = 2;
    cx.strokeRect(button.x, button.y, button.width, button.height);

    cx.fillStyle = "rgba(255, 255, 255, 0.4)";
    cx.fillText(
        button.symbol,
        button.x + button.width / 2 - symbolWidth / 2,
        button.y + button.height / 2 + symbolWidth * 0.45,
        symbolWidth,
    );
};

export const getControls = (): Controls => {
    return controls;
};
