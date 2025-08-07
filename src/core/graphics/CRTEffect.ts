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

import { GraphicsDetailLevel } from "./GraphicsDetailLevel";

let scanlineCanvas: HTMLCanvasElement | null = null;
let scanlineContext: CanvasRenderingContext2D | null = null;

const createScanlineCanvas = (
    width: number,
    height: number,
    opacity: number,
): void => {
    scanlineCanvas = document.createElement("canvas");
    scanlineCanvas.width = width;
    scanlineCanvas.height = height;
    scanlineContext = scanlineCanvas.getContext("2d");

    if (scanlineContext) {
        scanlineContext.fillStyle = `rgba(0, 0, 0, ${1 - opacity})`;
        for (let y = 0; y < height; y += 2) {
            scanlineContext.fillRect(0, y, width, 1);
        }
    }
};

export const renderCRTEffect = (
    canvas: HTMLCanvasElement,
    cx: CanvasRenderingContext2D,
    detailLevel: GraphicsDetailLevel,
    noisy = true,
): void => {
    const width = canvas.width;
    const height = canvas.height;

    // Base opacity values to preserve your existing setup
    const baseOpacity = noisy ? 0.7 : 0.8;
    let opacity = baseOpacity;
    let noiseFactor = noisy ? 10 : 0;

    // Adjust effects based on detail level
    switch (detailLevel) {
        case GraphicsDetailLevel.LOW: {
            // Ultra-lightweight effect for LOW level
            // Skip the gradient entirely and use simple flat shading

            // Just add a simple vignette effect (darkened corners)
            cx.fillStyle = "rgba(0, 0, 0, 0.2)";
            cx.fillRect(0, 0, width, height);

            cx.globalAlpha = 0.05; // Even lower opacity
            cx.fillStyle = "#000";
            for (let y = 0; y < height; y += 2) {
                cx.fillRect(0, y, width, 1);
            }
            cx.globalAlpha = 1.0;
            return;
        }

        case GraphicsDetailLevel.MEDIUM:
            // Medium level - lighter effects, no noise
            opacity = baseOpacity * 0.7;
            noiseFactor = 0; // Disable noise in medium level
            break;

        case GraphicsDetailLevel.HIGH:
        default:
            // Full effects - use original values
            break;
    }

    // Only process image data if we're not in LOW level (handled above)
    const imageData = cx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Precompute noise values if noisy is true
    const noiseValues =
        noisy && noiseFactor > 0 ? new Float32Array(width * height) : null;
    if (noisy && noiseValues && noiseFactor > 0) {
        for (let i = 0; i < noiseValues.length; i++) {
            noiseValues[i] = (Math.random() - 0.5) * noiseFactor;
        }
    }

    // Apply noise
    if (noisy && noiseValues && noiseFactor > 0) {
        for (let y = 0; y < height; y++) {
            const yOffset = y * width;
            for (let x = 0; x < width; x++) {
                const index = (yOffset + x) * 4;
                const noise = noiseValues[yOffset + x];
                data[index] += noise;
                data[index + 1] += noise;
                data[index + 2] += noise;
            }
        }
    }

    cx.putImageData(imageData, 0, 0);

    if (
        detailLevel === GraphicsDetailLevel.HIGH ||
        detailLevel === GraphicsDetailLevel.MEDIUM
    ) {
        // Create scanline canvas if it doesn't exist
        if (
            !scanlineCanvas ||
            scanlineCanvas.width !== width ||
            scanlineCanvas.height !== height
        ) {
            createScanlineCanvas(width, height, opacity);
        }

        // Blend the scanline pattern with the main canvas
        if (scanlineContext && scanlineCanvas) {
            cx.globalAlpha = opacity;
            cx.drawImage(scanlineCanvas, 0, 0);
            cx.globalAlpha = 1.0; // Reset alpha
        }
    }
};
