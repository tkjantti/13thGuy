/*
 * Easing functions from
 * https://easings.net/
 */

export function easeInOutQuad(x: number): number {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function easeInOutSine(x: number): number {
    return -(Math.cos(Math.PI * x) - 1) / 2;
}

export function easeInQuad(x: number): number {
    return x * x;
}
