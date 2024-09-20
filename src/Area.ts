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

import { Vector } from "./Vector";

export interface Dimensions {
    readonly width: number;
    readonly height: number;
}

export interface Area extends Dimensions {
    x: number;
    y: number;
}

export function getCenter(area: Area): Vector {
    return {
        x: area.x + area.width / 2,
        y: area.y + area.height / 2,
    };
}

export function overlap(a: Area, b: Area): boolean {
    const horizontally = b.x <= a.x + a.width && a.x <= b.x + b.width;
    const vertically = b.y <= a.y + a.height && a.y <= b.y + b.height;

    return horizontally && vertically;
}

export function includes(host: Area, o: Area): boolean {
    const horizontally = host.x <= o.x && o.x + o.width <= host.x + host.width;
    const vertically = host.y <= o.y && o.y + o.height <= host.y + host.height;

    return horizontally && vertically;
}
