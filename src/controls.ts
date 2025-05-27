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
import { renderText, TextSize } from "./text";
import { getKeys, initializeKeyboard, waitForEnter } from "./keyboard";
import {
    hasTouchScreen,
    initializeTouchscreen,
    listenTouch,
    waitForTap,
    waitForTapAndPlaySound,
} from "./touchscreen";
import { normalize, VectorMutable, ZERO_VECTOR } from "./Vector";
import { createButton } from "./HtmlButton";

export interface Controls {
    movement: VectorMutable;
}

const createControlButton = (id: string, text: string): HTMLButtonElement => {
    const button = createButton(id, text);
    button.style.background = "rgba(50, 50, 50, 0.05)";
    button.style.display = "none";
    return button;
};

let textAnimationCounter = 0;

interface TouchButtons {
    left: HTMLButtonElement;
    right: HTMLButtonElement;
    up: HTMLButtonElement;
    down: HTMLButtonElement;
}

let touchButtons: TouchButtons | undefined;

let touchLeft: boolean;
let touchRight: boolean;
let touchUp: boolean;
let touchDown: boolean;

const controls: Controls = {
    movement: { x: 0, y: 0 },
};

export const setTouchControlsVisibility = (isVisible: boolean): void => {
    if (!touchButtons) {
        return;
    }

    const { left, right, up, down } = touchButtons;
    const displayStyle = isVisible ? "block" : "none";

    left.style.display = displayStyle;
    right.style.display = displayStyle;
    up.style.display = displayStyle;
    down.style.display = displayStyle;
};

export const updateControls = (): void => {
    const keys = getKeys();

    const left = keys.ArrowLeft || keys.KeyA || touchLeft;
    const right = keys.ArrowRight || keys.KeyD || touchRight;
    const up = keys.ArrowUp || keys.KeyW || touchUp;
    const down = keys.ArrowDown || keys.KeyS || touchDown;

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
    initializeTouchButtons();
};

const initializeTouchButtons = (): void => {
    if (!hasTouchScreen) {
        return;
    }

    const buttons: TouchButtons = {
        left: createControlButton("left", "◁"),
        right: createControlButton("right", "▷"),
        up: createControlButton("up", "△"),
        down: createControlButton("down", "▽"),
    };

    const { left, right, up, down } = buttons;

    document.body.appendChild(left);
    document.body.appendChild(right);
    document.body.appendChild(up);
    document.body.appendChild(down);

    listenTouch(left, (isTouching) => (touchLeft = isTouching));
    listenTouch(right, (isTouching) => (touchRight = isTouching));
    listenTouch(up, (isTouching) => (touchUp = isTouching));
    listenTouch(down, (isTouching) => (touchDown = isTouching));

    window.addEventListener(
        "resize",
        () => resizeTouchControls(buttons),
        false,
    );
    resizeTouchControls(buttons);

    touchButtons = buttons;
};

const resizeTouchControls = (buttons: TouchButtons): void => {
    const { left, right, up, down } = buttons;

    const buttonWidth = canvas.width * 0.1;
    const buttonHeight = buttonWidth;
    const horizontalButtonWidth = buttonWidth;
    const horizontalButtonHeight = buttonHeight;
    const verticalButtonWidth = buttonWidth;
    const verticalButtonHeight = buttonHeight;
    const horizontalBottomMargin = canvas.height * 0.18;
    const verticalBottomMargin = canvas.height * 0.14;
    const leftMargin = canvas.width * 0.03;
    const rightMargin = canvas.width * 0.06;
    const xGap = canvas.width * 0.01;
    const yGap = canvas.height * 0.02;

    left.style.left = `${leftMargin}px`;
    left.style.bottom = `${horizontalBottomMargin}px`;
    left.style.width = `${horizontalButtonWidth}px`;
    left.style.height = `${horizontalButtonHeight}px`;

    right.style.left = `${leftMargin + horizontalButtonWidth + xGap}px`;
    right.style.bottom = `${horizontalBottomMargin}px`;
    right.style.width = `${horizontalButtonWidth}px`;
    right.style.height = `${horizontalButtonHeight}px`;

    up.style.right = `${rightMargin}px`;
    up.style.bottom = `${verticalBottomMargin + verticalButtonHeight + yGap}px`;
    up.style.width = `${verticalButtonWidth}px`;
    up.style.height = `${verticalButtonHeight}px`;

    down.style.right = `${rightMargin}px`;
    down.style.bottom = `${verticalBottomMargin}px`;
    down.style.width = `${verticalButtonWidth}px`;
    down.style.height = `${verticalButtonHeight}px`;
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

export const getControls = (): Controls => {
    return controls;
};
