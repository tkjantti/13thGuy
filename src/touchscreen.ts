/*
 * Copyright (c) 2024 Tero Jäntti, Sami Heikkinen
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
import { Vector, VectorMutable } from "./Vector";

let isTouching: boolean = false;
let touchPosition: VectorMutable = { x: 0, y: 0 };

export const initializeTouchscreen = (): void => {
    canvas.ontouchstart = (e: TouchEvent): void => {
        e.preventDefault();
        isTouching = true;
        const offset = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        touchPosition.x = touch.clientX - offset.left;
        touchPosition.y = touch.clientY - offset.top;
    };
    canvas.ontouchmove = (e: TouchEvent): void => {
        e.preventDefault();
        const offset = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        touchPosition.x = touch.clientX - offset.left;
        touchPosition.y = touch.clientY - offset.top;
    };
    canvas.ontouchend = (e: TouchEvent): void => {
        e.preventDefault();
        isTouching = false;
    };
};

export const getTouchPosition = (): Vector | null =>
    isTouching ? touchPosition : null;
