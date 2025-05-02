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

import { Area, includesPoint } from "./Area";
import { canvas } from "./graphics";
import { VectorMutable } from "./Vector";
import { setCanvasPositionFromScreenPosition } from "./window";

// An optimized data structure for keeping track of touches:
// no new vector instances on every frame. Note that there is
// a separate variable for the array count.
const MAX_TOUCH_COUNT = 4;
let touchPositionsCount: number = 0;
const touchPositions: readonly VectorMutable[] = [
    ...Array(MAX_TOUCH_COUNT),
].map(() => ({
    x: 0,
    y: 0,
}));

export const hasTouchScreen = "ontouchstart" in window;

export const initializeTouchscreen = (): void => {
    if (!hasTouchScreen) {
        return;
    }

    // Note: for preventing double-tap, also if the touch
    // is outside the canvas, this should be added to the CSS:
    //
    // * {
    //     touch-action: none;
    // }

    // Prevent a context menu, also when a long tap is done
    // outside of canvas.
    window.oncontextmenu = (e): void => {
        e.preventDefault();
    };

    canvas.ontouchstart = (e: TouchEvent): void => {
        e.preventDefault();
        readTouchInput(e);
    };
    canvas.ontouchmove = (e: TouchEvent): void => {
        e.preventDefault();
        readTouchInput(e);
    };
    canvas.ontouchend = (e: TouchEvent): void => {
        e.preventDefault();
        readTouchInput(e);
    };
};

const readTouchInput = (e: TouchEvent): void => {
    touchPositionsCount = Math.min(e.touches.length, MAX_TOUCH_COUNT);

    for (let i = 0; i < touchPositionsCount; i++) {
        setCanvasPositionFromScreenPosition(touchPositions[i], e.touches[i]);
    }
};

export const waitForTap = (area?: Area): Promise<void> => {
    return new Promise((resolve) => {
        const listener = (e: TouchEvent): void => {
            // Prevent default behavior if the touch is on the canvas
            e.preventDefault();

            // Use changedTouches for touchend/touchstart to get the specific touch point
            const touch = e.changedTouches[0];
            if (!touch) return; // Exit if no touch information is available

            const point: VectorMutable = { x: 0, y: 0 };

            setCanvasPositionFromScreenPosition(point, touch);

            if (!area || includesPoint(area, point)) {
                canvas.removeEventListener("touchstart", listener); // Remove listener from canvas
                resolve();
            }
        };

        // Add listener to canvas instead of window
        canvas.addEventListener("touchstart", listener, { passive: false });
    });
};

export const isTouching = (area: Area): boolean => {
    for (let i = 0; i < touchPositionsCount; i++) {
        if (includesPoint(area, touchPositions[i])) {
            return true;
        }
    }

    return false;
};
