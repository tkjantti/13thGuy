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

export interface Vector {
    readonly x: number;
    readonly y: number;
}

export const ZERO_VECTOR = { x: 0, y: 0 };

export function isZero(a: Vector): boolean {
    return a.x === 0 && a.y === 0;
}

export function distance(a: Vector, b: Vector): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function distanceX(a: Vector, b: Vector): number {
    return Math.abs(a.x - b.x);
}

export function distanceY(a: Vector, b: Vector): number {
    return Math.abs(a.y - b.y);
}

export function length(a: Vector): number {
    return Math.sqrt(a.x * a.x + a.y * a.y);
}

export function add(a: Vector, b: Vector): Vector {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
    };
}

export function subtract(a: Vector, b: Vector): Vector {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
    };
}

export function multiply(a: Vector, multiplier: number): Vector {
    return {
        x: a.x * multiplier,
        y: a.y * multiplier,
    };
}

export function divide(a: Vector, divisor: number): Vector {
    return {
        x: a.x / divisor,
        y: a.y / divisor,
    };
}

export function normalize(a: Vector): Vector {
    return divide(a, length(a));
}

export function dotProduct(a: Vector, b: Vector): number {
    return a.x * b.x + a.y * b.y;
}
