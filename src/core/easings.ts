/*
 * Easing functions from
 * https://easings.net/
 */

export function easeInOutSine(x: number): number {
    return -(Math.cos(Math.PI * x) - 1) / 2;
}

export function easeInOutQuad(x: number): number {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function easeInQuad(x: number): number {
    return x * x;
}

export function easeInOutExpo(x: number): number {
    return x === 0
        ? 0
        : x === 1
          ? 1
          : x < 0.5
            ? Math.pow(2, 20 * x - 10) / 2
            : (2 - Math.pow(2, -20 * x + 10)) / 2;
}
