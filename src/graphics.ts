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

import {
    PerformanceMode,
    getEffectivePerformanceMode,
    shouldRender,
    setRaceMode,
    initializeGraphics,
    togglePerformanceMode,
    setPerformanceToggleButton,
    checkPerformanceOnRaceStart,
    resetRacePerformanceCheck,
    getIsInRaceMode,
} from "./performance";

import { isDesktop } from "./deviceDetection";

// Button style variables
const buttonStyles = {
    top: "10px",
    zIndex: "10",
    size: "40px",
    color: "rgba(255, 255, 255, 0.4)",
    background: "black",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "4px",
    fontSize: "24px",
    lineHeight: "0",
};

export const canvas = document.querySelector("canvas") as HTMLCanvasElement;
export const cx: CanvasRenderingContext2D = canvas.getContext("2d", {
    willReadFrequently: true,
})!;

let scanlineCanvas: HTMLCanvasElement | null = null;
let scanlineContext: CanvasRenderingContext2D | null = null;
let gradient: CanvasGradient;

export const START_BUTTON_ID = "startButton";

// Create scanline canvas for visual effects
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
    const width = canvas.width;
    const height = canvas.height;

    let effectiveMode;

    // Get base effective mode (resolve AUTO first)
    const baseMode = getEffectivePerformanceMode();

    if (getIsInRaceMode()) {
        // Changed from isInRaceMode
        effectiveMode = baseMode;
    } else {
        // During menus: ensure better visuals
        effectiveMode =
            baseMode === PerformanceMode.LOW
                ? PerformanceMode.MEDIUM
                : baseMode;
    }

    // Base opacity values to preserve your existing setup
    const baseOpacity = noisy ? 0.7 : 0.8;
    let opacity = baseOpacity;
    let noiseFactor = noisy ? 10 : 0;

    // Adjust effects based on performance mode
    switch (effectiveMode) {
        case PerformanceMode.LOW: {
            // Ultra-lightweight effect for LOW mode
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

        case PerformanceMode.MEDIUM:
            // Medium mode - lighter effects, no noise
            opacity = baseOpacity * 0.7;
            noiseFactor = 0; // Disable noise in medium mode
            break;

        case PerformanceMode.HIGH:
        default:
            // Full effects - use original values
            break;
    }

    // Only process image data if we're not in LOW mode (handled above)
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

    // Only apply scanlines in HIGH or MEDIUM mode
    if ((effectiveMode as PerformanceMode) !== PerformanceMode.LOW) {
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

// Apply gradient effect with performance optimization
export const applyGradient = () => {
    // Only apply performance optimization during actual racing
    const effectiveMode = getIsInRaceMode() // Changed from isInRaceMode
        ? getEffectivePerformanceMode()
        : PerformanceMode.HIGH;

    // Skip gradient entirely in LOW performance mode during race
    if (effectiveMode === PerformanceMode.LOW) {
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
        ? getEffectivePerformanceMode()
        : PerformanceMode.HIGH;

    // Use a much simpler effect in LOW mode
    if (effectiveMode === PerformanceMode.LOW) {
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

// Button creation functions
export function createFullscreenButton(
    hasTouchScreen: boolean,
): HTMLButtonElement {
    const button = document.createElement("button");

    // Apply button styling
    button.id = "fullscreenButton";
    button.style.position = "absolute";
    button.style.top = buttonStyles.top;
    button.style.right = "10px";
    button.style.zIndex = buttonStyles.zIndex;
    button.textContent = "⛶";
    button.style.fontFamily = "Impact";
    button.style.width = buttonStyles.size;
    button.style.height = buttonStyles.size;
    button.style.color = buttonStyles.color;
    button.style.background = buttonStyles.background;
    button.style.border = buttonStyles.border;
    button.style.borderRadius = buttonStyles.borderRadius;
    button.style.fontSize = buttonStyles.fontSize;
    button.style.lineHeight = buttonStyles.lineHeight;
    button.style.display = hasTouchScreen ? "none" : "block";

    return button;
}

export function createRestartButton(): HTMLButtonElement {
    const button = document.createElement("button");

    // Button styling
    button.id = "restartButton";
    button.style.position = "absolute";
    button.style.top = buttonStyles.top;
    button.style.right = "60px";
    button.style.zIndex = buttonStyles.zIndex;
    button.textContent = "↺";
    button.style.fontFamily = "Impact";
    button.style.width = buttonStyles.size;
    button.style.height = buttonStyles.size;
    button.style.color = buttonStyles.color;
    button.style.background = buttonStyles.background;
    button.style.border = buttonStyles.border;
    button.style.borderRadius = buttonStyles.borderRadius;
    button.style.fontSize = buttonStyles.fontSize;
    button.style.lineHeight = buttonStyles.lineHeight;
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
    button.style.zIndex = buttonStyles.zIndex;
    button.style.color = buttonStyles.color;
    button.style.display = "none";
    button.style.padding = "20vw 0 0 0";
    button.style.fontFamily = "Courier New";
    button.style.zIndex = buttonStyles.zIndex;
    button.textContent = "Tap the screen to continue█";

    return button;
}

export const createToggleButton = () => {
    const performanceToggleButton = document.createElement("button");

    // Style button
    if (isDesktop) {
        performanceToggleButton.style.top = "10px";
        performanceToggleButton.style.left = "10px";
        performanceToggleButton.style.height = buttonStyles.size;
        performanceToggleButton.style.fontSize = buttonStyles.fontSize;
        performanceToggleButton.style.background = buttonStyles.background;
        performanceToggleButton.style.border = buttonStyles.border;
        performanceToggleButton.style.borderRadius = buttonStyles.borderRadius;
    } else {
        performanceToggleButton.style.top = "60px";
        performanceToggleButton.style.right = "10px";
        performanceToggleButton.style.height = `${parseInt(buttonStyles.size) / 2}px`;
        performanceToggleButton.style.padding = "20px 0"; // Add padding for touch target
        performanceToggleButton.style.fontSize = `${parseInt(buttonStyles.fontSize) / 2}px`;
        performanceToggleButton.style.background = "rgba(0, 0, 0, 0.2)";
        performanceToggleButton.style.border = "none";
    }

    performanceToggleButton.style.position = "absolute";
    performanceToggleButton.style.minWidth = "90px";
    performanceToggleButton.style.fontFamily = "Impact";
    performanceToggleButton.style.height = buttonStyles.size;
    performanceToggleButton.style.color = buttonStyles.color;
    performanceToggleButton.style.lineHeight = buttonStyles.lineHeight;
    performanceToggleButton.style.zIndex = buttonStyles.zIndex;

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

// Re-export performance functions that need to be accessible from outside
export {
    PerformanceMode,
    setRaceMode,
    shouldRender,
    initializeGraphics,
    togglePerformanceMode,
    checkPerformanceOnRaceStart,
    resetRacePerformanceCheck,
    getIsInRaceMode, // Re-export the new function
};
