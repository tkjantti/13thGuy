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

import {
    playTune,
    SFX_KB,
    // Ignore lint errors from JS import
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
} from "./sfx/sfx.js";
import { Area, includesPoint } from "./Area";
import { canvas, cx, renderText } from "./graphics";
import { getKeys, initializeKeyboard, waitForEnter } from "./keyboard";
import {
    getTouchPosition,
    hasTouchScreen,
    initializeTouchscreen,
    waitForTap,
} from "./touchscreen";
import { normalize, VectorMutable, ZERO_VECTOR } from "./Vector";

export interface Controls {
    movement: VectorMutable;
}

interface Button extends Area {
    readonly symbol: string;
}

const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");

let textAnimationCounter = 0;

const leftButton: Button = { symbol: "◀", x: 0, y: 0, width: 0, height: 0 };
const rightButton: Button = { symbol: "▶", x: 0, y: 0, width: 0, height: 0 };
const upButton: Button = { symbol: "▲", x: 0, y: 0, width: 0, height: 0 };
const downButton: Button = { symbol: "▼", x: 0, y: 0, width: 0, height: 0 };

// Limit area to touch when progressing to a next screen, so that pressing
// the touch controls would not accidentally trigger touch.
const progressTouchArea: Area = { x: 0, y: 0, width: 0, height: 0 };

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

    const touchAreaMargin = canvas.width * 0.1;
    progressTouchArea.x = rightButton.x + rightButton.width + touchAreaMargin;
    progressTouchArea.y = 0;
    progressTouchArea.width =
        upButton.x - (rightButton.x + rightButton.width) - 2 * touchAreaMargin;
    progressTouchArea.height = canvas.height;
};

export const waitForProgressInput = async (): Promise<void> => {
    await (hasTouchScreen ? waitForTap(progressTouchArea) : waitForEnter());
    playTune(SFX_KB);
};

export const renderWaitForProgressInput = (
    action = "continue",
    y = 100,
): void => {
    const text = (hasTouchScreen ? "Tap to " : "Press ENTER to ") + action;

    renderText(
        text + (textAnimationCounter++ % 60 === 0 ? "" : "█"),
        24,
        "Courier New",
        1,
        canvas.height / 2 + y,
        false,
        canvas.width / 2 -
            // Let's check if Firefox as there is a difference in rendering this versus Chromium based browsers
            cx.measureText(text).width * (isFirefox ? 1.95 : 2) +
            64,
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
