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

export const canvas = document.querySelector("canvas") as HTMLCanvasElement;
export const cx: CanvasRenderingContext2D = canvas.getContext("2d", {
    willReadFrequently: true,
})!;

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

export const applyCRTEffect = (noisy = true): void => {
    const width = canvas.width;
    const height = canvas.height;
    const imageData = cx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const opacity = noisy ? 0.7 : 0.8;
    const noiseFactor = noisy ? 10 : 0;

    // Precompute noise values if noisy is true
    const noiseValues = noisy ? new Float32Array(width * height) : null;
    if (noisy && noiseValues) {
        for (let i = 0; i < noiseValues.length; i++) {
            noiseValues[i] = (Math.random() - 0.5) * noiseFactor;
        }
    }

    // Apply noise
    if (noisy && noiseValues) {
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
};

let gradient: CanvasGradient;

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

export const applyGradient = () => {
    if (!gradient) {
        createGradient();
    }
    cx.fillStyle = gradient;
    cx.fillRect(0, 0, canvas.width, canvas.height);
};

// Faster than using .filter
export const applyGrayscale = () => {
    // Get the image data
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

export const renderText = (
    text: string,
    fontSize: number,
    fontName: string,
    alpha = 1,
    yAdjust = 0,
    center = true,
    xAdjust = 0,
) => {
    cx.save();
    cx.globalAlpha = alpha > 0 ? alpha : 0;
    cx.fillStyle = "white";
    cx.font = fontSize + "px " + fontName;
    const textWidth = cx.measureText(text).width;
    cx.fillText(
        text,
        center ? (canvas.width - textWidth) / 2 + xAdjust : xAdjust,
        center ? canvas.height / 2 + yAdjust : fontSize + yAdjust,
    );
    cx.restore();
};

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
