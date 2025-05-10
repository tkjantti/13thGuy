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

// Add deviceMemory property to Navigator interface
declare global {
    interface Navigator {
        deviceMemory?: number;
    }

    interface Window {
        webkitRequestFileSystem?: (
            type: number,
            size: number,
            successCallback: () => void,
            errorCallback: () => void,
        ) => void;
        TEMPORARY?: number;
    }
}

export const canvas = document.querySelector("canvas") as HTMLCanvasElement;
export const cx: CanvasRenderingContext2D = canvas.getContext("2d", {
    willReadFrequently: true,
})!;

// Target framerate for low-performance devices
const LOW_PERFORMANCE_FPS = 60;
let lastFrameTime = 0;

// Add this near the top with other variables
let performanceToggleButton: HTMLButtonElement | null = null;

/**
 * Performance mode settings
 */
export enum PerformanceMode {
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low",
}

const isIPad =
    /iPad/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document);

const isSafari =
    /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Current performance mode setting
let currentPerformanceMode: PerformanceMode = PerformanceMode.HIGH;

// Replace the detectLowPerformanceMode function
export function detectLowPerformanceMode(): boolean {
    // IMPORTANT: For iPad + Safari, we'll use a direct, synchronous approach
    if (isIPad && isSafari) {
        // Direct test for private mode on Safari - this is synchronous and reliable
        try {
            // The most reliable test for Safari private mode is localStorage
            // If in private mode, this will throw an exception immediately
            window.localStorage.setItem("test", "test");
            window.localStorage.removeItem("test");

            console.log("iPad Safari normal mode detected");
            // If we reach here, it's not in private mode
        } catch {
            // If localStorage access throws an error on iPad Safari,
            // it's almost certainly in private mode
            return true;
        }
    }

    // For other devices, use the standard detection logic
    let isPrivateBrowsing = false;

    try {
        const testKey = "test_private";
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
    } catch {
        isPrivateBrowsing = true;
    }

    // Rest of your checking logic
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    const hasLimitedResources =
        (typeof navigator.hardwareConcurrency !== "undefined" &&
            navigator.hardwareConcurrency <= 2) ||
        (typeof navigator.deviceMemory !== "undefined" &&
            navigator.deviceMemory < 2);

    if ((isIOS && isPrivateBrowsing) || hasLimitedResources) {
        console.log(
            "Limited resources or iOS private browsing - using low performance mode",
        );
        return true;
    }

    // Better desktop performance detection
    const isOlderDesktop =
        navigator.hardwareConcurrency <= 4 &&
        (!navigator.deviceMemory || navigator.deviceMemory <= 4) &&
        !isIOS &&
        !isIPad;

    if (isOlderDesktop) {
        console.log("Older desktop detected - using medium performance mode");
        // For desktop, consider returning false but setting MEDIUM mode instead of LOW
        setPerformanceMode(PerformanceMode.MEDIUM);
        return false;
    }

    return false;
}

// Add frame throttling for low-performance devices
export function shouldRender(timestamp: number): boolean {
    if (currentPerformanceMode !== PerformanceMode.LOW) {
        return true;
    }

    // Frame rate limiting for LOW performance mode
    const targetFrameTime = 1000 / LOW_PERFORMANCE_FPS;
    if (timestamp - lastFrameTime >= targetFrameTime) {
        lastFrameTime = timestamp;
        return true;
    }
    return false;
}

/**
 * Set the performance mode manually
 */
export function setPerformanceMode(mode: PerformanceMode): void {
    console.log(`Setting graphics performance mode to: ${mode}`);
    currentPerformanceMode = mode;
}

/**
 * Get current performance mode
 */
export function getPerformanceMode(): PerformanceMode {
    return currentPerformanceMode;
}

/**
 * Auto-configure performance settings based on device capabilities
 */
export function autoConfigurePerformance(): void {
    if (detectLowPerformanceMode()) {
        setPerformanceMode(PerformanceMode.LOW);
    } else {
        // Could add more detection for medium vs high
        setPerformanceMode(PerformanceMode.HIGH);
    }
}

/**
 * Initialize graphics settings
 */
export function initializeGraphics(): void {
    console.log("Initializing graphics with performance detection...");
    autoConfigurePerformance();

    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();

    // Special handling for iPad performance issues
    if (isIPad && isSafari) {
        // Add listener for performance issues
        let frameDropCounter = 0;
        let lastCheckTime = Date.now();

        // Monitor for performance issues during gameplay
        const checkPerformance = () => {
            if (currentPerformanceMode !== PerformanceMode.LOW) {
                const now = Date.now();
                if (now - lastCheckTime > 5000) {
                    // Check every 5 seconds
                    if (frameDropCounter > 20) {
                        console.log(
                            "Performance issues detected - switching to LOW mode",
                        );
                        setPerformanceMode(PerformanceMode.LOW);
                    }
                    frameDropCounter = 0;
                    lastCheckTime = now;
                }
            }
            requestAnimationFrame(checkPerformance);
        };

        requestAnimationFrame(checkPerformance);
    }

    console.log("Performance mode set to:", currentPerformanceMode);
}

// Update the togglePerformanceMode function
export function togglePerformanceMode(): void {
    const modes = [
        PerformanceMode.HIGH,
        PerformanceMode.MEDIUM,
        PerformanceMode.LOW,
    ];
    const currentIndex = modes.indexOf(currentPerformanceMode);
    const nextIndex = (currentIndex + 1) % modes.length;

    // Set mode directly
    currentPerformanceMode = modes[nextIndex];

    // Update button text if it exists
    if (performanceToggleButton) {
        if (isMobileDevice) {
            performanceToggleButton.textContent = `GFX: ${currentPerformanceMode}`;
        } else {
            performanceToggleButton.textContent = `[G] GFX: ${currentPerformanceMode}`;
        }
    }
}

// Add runtime performance monitoring
let lastFrameTimes: number[] = [];
const MAX_SAMPLES = 60;
let slowFrames = 0;

const checkPerformance = (timestamp: number) => {
    const lastRender = lastFrameTimes.length
        ? lastFrameTimes[lastFrameTimes.length - 1]
        : 0;
    const frameTime = timestamp - lastRender;

    if (lastRender) {
        // Count frames that are too slow (16.7ms = 60fps)
        if (frameTime > 33) {
            // Frame took > 33ms (< 30fps)
            slowFrames++;
        }

        // Every 60 frames, check performance
        if (lastFrameTimes.length >= MAX_SAMPLES) {
            if (
                slowFrames > 10 &&
                currentPerformanceMode !== PerformanceMode.LOW
            ) {
                console.log(
                    "Performance issues detected - switching to lower mode",
                );
                const nextMode =
                    currentPerformanceMode === PerformanceMode.HIGH
                        ? PerformanceMode.MEDIUM
                        : PerformanceMode.LOW;
                setPerformanceMode(nextMode);
            }

            // Reset measurements
            lastFrameTimes = [];
            slowFrames = 0;
        }
    }

    lastFrameTimes.push(timestamp);
    requestAnimationFrame(checkPerformance);
};

requestAnimationFrame(checkPerformance);

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

    // Base opacity values to preserve your existing setup
    const baseOpacity = noisy ? 0.7 : 0.8;
    let opacity = baseOpacity;
    let noiseFactor = noisy ? 10 : 0;

    // Adjust effects based on performance mode
    switch (currentPerformanceMode) {
        case PerformanceMode.LOW: {
            // Even in LOW mode, apply a visible but simple effect
            const gradient = cx.createRadialGradient(
                width / 2,
                height / 2,
                height / 3,
                width / 2,
                height / 2,
                height,
            );
            gradient.addColorStop(0, "rgba(0,0,0,0)");
            gradient.addColorStop(1, "rgba(0,0,0,0.3)"); // Slightly darker

            cx.fillStyle = gradient;
            cx.fillRect(0, 0, width, height);

            // Add very simple scanlines (every 8px instead of 2px)
            cx.globalAlpha = 0.15;
            cx.fillStyle = "#000";
            for (let y = 0; y < height; y += 8) {
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
    if ((currentPerformanceMode as PerformanceMode) !== PerformanceMode.LOW) {
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
    // Skip gradient entirely in LOW performance mode
    if (currentPerformanceMode === PerformanceMode.LOW) {
        return;
    }

    // Original gradient code
    if (!gradient) {
        createGradient();
    }
    cx.fillStyle = gradient;
    cx.fillRect(0, 0, canvas.width, canvas.height);
};

// Override applyGrayscale for performance
export const applyGrayscale = () => {
    // Use a much simpler effect in LOW mode
    if (currentPerformanceMode === PerformanceMode.LOW) {
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

export const START_BUTTON_ID = "startButton";

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

/**
 * Creates a fullscreen toggle button
 */
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

/**
 * Creates a restart button
 */
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

/**
 * Creates a start button for touch screens
 */
export function createStartButton(): HTMLButtonElement {
    const button = document.createElement("button");

    // Button styling
    button.id = START_BUTTON_ID;
    button.style.position = "absolute";
    button.textContent = "Tap the screen to continue█";
    button.style.padding = "20vw 0 0 0";
    button.style.fontFamily = "Courier New";
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

    return button;
}

// Replace the click listener in createToggleButton
export const createToggleButton = () => {
    performanceToggleButton = document.createElement("button");

    if (performanceToggleButton) {
        if (isMobileDevice) {
            performanceToggleButton.textContent = `GFX: ${currentPerformanceMode}`;
        } else {
            performanceToggleButton.textContent = `[G] GFX: ${currentPerformanceMode}`;
        }
    }

    // Style the button
    performanceToggleButton.style.position = "absolute";
    performanceToggleButton.style.bottom = "10px";
    performanceToggleButton.style.right = "10px";
    performanceToggleButton.style.fontFamily = "Impact";
    performanceToggleButton.style.height = buttonStyles.size;
    performanceToggleButton.style.color = buttonStyles.color;
    performanceToggleButton.style.background = buttonStyles.background;
    performanceToggleButton.style.border = buttonStyles.border;
    performanceToggleButton.style.borderRadius = buttonStyles.borderRadius;
    performanceToggleButton.style.fontSize = "1.5vw";
    performanceToggleButton.style.lineHeight = buttonStyles.lineHeight;
    performanceToggleButton.style.zIndex = buttonStyles.zIndex;

    // Add click listener with blur
    performanceToggleButton.addEventListener("click", (e) => {
        e.preventDefault();
        togglePerformanceMode();
        performanceToggleButton?.blur(); // Remove focus from button
    });

    return performanceToggleButton;
};

// Add this function to initialize keyboard shortcuts
export function initializeKeyboardShortcuts(): void {
    // Add keyboard listener for 'g' key on desktop
    if (!isMobileDevice) {
        document.addEventListener("keydown", (e) => {
            // 'g' key for "Graphics"
            if (e.key === "g" || e.key === "G") {
                togglePerformanceMode();
            }
        });

        // Add tooltip to button to show keyboard shortcut
        if (performanceToggleButton) {
            performanceToggleButton.textContent = `[G] GFX: ${currentPerformanceMode}`;
        }
    }
}
