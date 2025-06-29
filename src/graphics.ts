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

import { applyCRT } from "./core/CRTEffect";
import {
    getEffectiveGraphicsDetailMode,
    shouldRender,
    setRaceMode,
    initializeGraphics,
    togglePerformanceMode,
    checkPerformanceOnRaceStart,
    resetRacePerformanceCheck,
    getIsInRaceMode,
} from "./core/performance";
import { GraphicsDetailMode } from "./core/GraphicsDetailMode";

export const canvas = document.querySelector("canvas") as HTMLCanvasElement;
export const cx: CanvasRenderingContext2D = canvas.getContext("2d", {
    willReadFrequently: true,
})!;

let gradient: CanvasGradient;

// Create gradient for visual effects
const createGradient = () => {
    const width = canvas.width;
    const height = canvas.height;
    gradient = cx.createRadialGradient(
        width / 2,
        height / 2,
        0, // Inner circle
        width / 2,
        height / 2,
        width / 2, // Outer circle
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");
};

// Visual effects
export const applyCRTEffect = (noisy = true): void => {
    let effectiveMode;

    // Get base detail mode (resolve AUTO first)
    const baseMode = getEffectiveGraphicsDetailMode();

    if (getIsInRaceMode()) {
        // Changed from isInRaceMode
        effectiveMode = baseMode;
    } else {
        // During menus: ensure better visuals
        effectiveMode =
            baseMode === GraphicsDetailMode.LOW
                ? GraphicsDetailMode.MEDIUM
                : baseMode;
    }

    applyCRT(canvas, cx, effectiveMode, noisy);
};

// Apply gradient effect with performance optimization
export const applyGradient = () => {
    // Only apply performance optimization during actual racing
    const effectiveMode = getIsInRaceMode() // Changed from isInRaceMode
        ? getEffectiveGraphicsDetailMode()
        : GraphicsDetailMode.HIGH;

    // Skip gradient entirely in LOW detail mode during race
    if (effectiveMode === GraphicsDetailMode.LOW) {
        return;
    }

    // Original gradient code
    if (!gradient) {
        createGradient();
    }
    cx.fillStyle = gradient;
    cx.fillRect(0, 0, canvas.width, canvas.height);
};

// Apply grayscale effect with performance optimization
export const applyGrayscale = () => {
    // Only apply performance optimization during actual racing
    const effectiveMode = getIsInRaceMode() // Changed from isInRaceMode
        ? getEffectiveGraphicsDetailMode()
        : GraphicsDetailMode.HIGH;

    // Use a much simpler effect in LOW mode
    if (effectiveMode === GraphicsDetailMode.LOW) {
        cx.globalAlpha = 0.5;
        cx.fillStyle = "rgba(0, 0, 0, 0.5)";
        cx.fillRect(0, 0, canvas.width, canvas.height);
        cx.globalAlpha = 1.0;
        return;
    }

    // Original grayscale code for other modes
    const imageData = cx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Loop through each pixel
    for (let i = 0; i < data.length; i += 4) {
        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];

        // Calculate the grayscale value
        const grayscale = red * 0.3 + green * 0.59 + blue * 0.11;

        // Set the pixel values to the grayscale value
        data[i] = data[i + 1] = data[i + 2] = grayscale * 0.7;
    }

    // Put the modified image data back onto the canvas
    cx.putImageData(imageData, 0, 0);
};

// Texture creation functions
export const createFabricTexture = () => {
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = 4;
    offscreenCanvas.height = 4;
    const offscreenCtx = offscreenCanvas.getContext("2d");
    if (!offscreenCtx) return;

    function drawLine(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: string | CanvasGradient | CanvasPattern,
    ) {
        if (!offscreenCtx) return;

        offscreenCtx.strokeStyle = color;
        offscreenCtx.beginPath();
        offscreenCtx.moveTo(x1, y1);
        offscreenCtx.lineTo(x2, y2);
        offscreenCtx.stroke();
    }

    const color = "#00000010";

    offscreenCtx.fillStyle = color;
    offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    for (let i = 0; i <= offscreenCanvas.width; i += 4) {
        drawLine(i, 0, i, offscreenCanvas.height, color);
        drawLine(0, i, offscreenCanvas.width, i, color);
    }

    return offscreenCtx.createPattern(offscreenCanvas, "repeat");
};

export const createPlateTexture = () => {
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = 64;
    offscreenCanvas.height = 64;
    const offscreenCtx = offscreenCanvas.getContext("2d");
    if (!offscreenCtx) return;

    const imageData = offscreenCtx.getImageData(
        0,
        0,
        offscreenCanvas.width,
        offscreenCanvas.height,
    );
    const data = imageData.data;
    const boxSize = 4; // Tile size
    for (let y = 0; y < offscreenCanvas.height; y += boxSize) {
        for (let x = 0; x < offscreenCanvas.width; x += boxSize) {
            const noise = Math.random() * 64;
            const alpha = Math.floor(Math.random() * 24); // Randowm alpha

            for (let dy = 0; dy < boxSize; dy++) {
                for (let dx = 0; dx < boxSize; dx++) {
                    const index =
                        ((y + dy) * offscreenCanvas.width + (x + dx)) * 4;
                    data[index] = Math.min(
                        255,
                        Math.max(0, data[index] + noise),
                    );
                    data[index + 1] = Math.min(
                        255,
                        Math.max(0, data[index + 1] + noise),
                    );
                    data[index + 2] = Math.min(
                        255,
                        Math.max(0, data[index + 2] + noise),
                    );
                    data[index + 3] = alpha; // Alpha
                }
            }
        }
    }
    offscreenCtx.putImageData(imageData, 0, 0);

    return offscreenCtx.createPattern(offscreenCanvas, "repeat");
};

// Re-export performance functions that need to be accessible from outside
export {
    setRaceMode,
    shouldRender,
    initializeGraphics,
    togglePerformanceMode,
    checkPerformanceOnRaceStart,
    resetRacePerformanceCheck,
    getIsInRaceMode, // Re-export the new function
};
