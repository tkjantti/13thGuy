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

import { isDesktop } from "./core/deviceDetection";
import { ButtonStyles, createButton } from "./core/HtmlButton";
import {
    setPerformanceToggleButton,
    togglePerformanceMode,
} from "./performance";

export const START_BUTTON_ID = "startButton";
export const RESTART_BUTTON_ID = "restartButton";
export const FULLSCREEN_BUTTON_ID = "fullscreenButton";

export function createFullscreenButton(
    hasTouchScreen: boolean,
): HTMLButtonElement {
    const button = createButton(FULLSCREEN_BUTTON_ID, "⛶");
    button.style.top = "10px";
    button.style.right = "10px";
    button.style.display = hasTouchScreen ? "none" : "block";
    return button;
}

export function createRestartButton(): HTMLButtonElement {
    const button = createButton(RESTART_BUTTON_ID, "↺");
    button.style.top = "10px";
    button.style.right = "60px";
    button.style.display = "none";
    return button;
}

export function createStartButton(): HTMLButtonElement {
    const button = document.createElement("button");

    button.id = START_BUTTON_ID;
    button.style.position = "absolute";
    button.style.background = "transparent";
    button.style.border = "none";
    button.style.fontSize = "2vw";
    button.style.top = "0";
    button.style.bottom = "0";
    button.style.left = "0";
    button.style.right = "0";
    button.style.zIndex = ButtonStyles.zIndex;
    button.style.color = ButtonStyles.color;
    button.style.display = "none";
    button.style.padding = "20vw 0 0 0";
    button.style.fontFamily = "Courier New";
    button.style.zIndex = ButtonStyles.zIndex;
    button.textContent = "Tap the screen to continue█";

    return button;
}

export const createPerformanceToggleButton = () => {
    const performanceToggleButton = createButton("performanceToggleButton", "");

    // Style button
    if (isDesktop) {
        performanceToggleButton.style.top = "10px";
        performanceToggleButton.style.left = "10px";
    } else {
        performanceToggleButton.style.top = "60px";
        performanceToggleButton.style.right = "10px";
        performanceToggleButton.style.height = `${parseInt(ButtonStyles.size) / 2}px`;
        performanceToggleButton.style.padding = "20px 0"; // Add padding for touch target
        performanceToggleButton.style.fontSize = `${parseInt(ButtonStyles.fontSize) / 2}px`;
        performanceToggleButton.style.background = "rgba(0, 0, 0, 0.2)";
        performanceToggleButton.style.border = "none";
    }

    // Add click listener with blur
    performanceToggleButton.addEventListener("click", (e) => {
        e.preventDefault();
        togglePerformanceMode();
        performanceToggleButton.blur(); // Remove focus from button
    });

    // Store the button in the performance module
    setPerformanceToggleButton(performanceToggleButton);

    return performanceToggleButton;
};
