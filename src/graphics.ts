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

// Update the global interface declarations at the top
declare global {
    interface Navigator {
        deviceMemory?: number;
        // Add proper typing for GPU property
        gpu?: unknown;
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

export const isIPad =
    /iPad/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document);
export const isSafari =
    /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
export const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(
    navigator.userAgent,
);
export const isIOS =
    // Traditional iOS detection
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // Modern iPad detection (iPadOS 13+ reports as Mac)
    (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);
export const isAndroid = /Android/.test(navigator.userAgent);
export const isDesktop = !isMobileDevice && !isIPad;

export const canvas = document.querySelector("canvas") as HTMLCanvasElement;
export const cx: CanvasRenderingContext2D = canvas.getContext("2d", {
    willReadFrequently: true,
})!;

// Target framerate for low-performance devices
const LOW_PERFORMANCE_FPS = 60;
let lastFrameTime = 0;

// Add this near the top with other variables
let performanceToggleButton: HTMLButtonElement | null = null;

// Add these variables near the top with other state variables
let hasCheckedRacePerformance = false;

// Add this flag to track when we're in a race vs menus/start screens
let isInRaceMode = false;

/**
 * Set whether the game is currently in race mode vs menus/start screens
 * Call this when transitioning between game states
 */
export function setRaceMode(inRace: boolean): void {
    isInRaceMode = inRace;
    console.log(`Race mode set to: ${inRace ? "ACTIVE" : "INACTIVE"}`);
}

/**
 * Performance mode settings
 */
enum PerformanceMode {
    AUTO = "auto", // New AUTO mode
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low",
}

// Change default to AUTO
let currentPerformanceMode: PerformanceMode = PerformanceMode.AUTO;

// Track whether AUTO has made a performance decision
let autoModeEffectiveMode: PerformanceMode = PerformanceMode.HIGH;

// Change from const to let so we can set it
let performanceTier: "high" | "medium" | "low";

/**
 * Get effective performance mode (resolves AUTO to actual mode)
 */
function getEffectivePerformanceMode(): PerformanceMode {
    if (currentPerformanceMode === PerformanceMode.AUTO) {
        return autoModeEffectiveMode;
    }
    return currentPerformanceMode;
}

// Replace the detectLowPerformanceMode function
export function detectLowPerformanceMode(): boolean {
    // IMPORTANT: For iPad + Safari, check ONLY for private mode
    if (isIPad && isSafari) {
        // Direct test for private mode on Safari
        try {
            window.localStorage.setItem("test", "test");
            window.localStorage.removeItem("test");
            // Normal mode for iPad - continue to more checks below
        } catch {
            // ONLY for iPad Safari in private mode, use LOW immediately
            console.log(
                "iPad Safari private mode - using LOW performance mode",
            );
            return true;
        }
    }

    // For other devices and iPad Safari in normal mode:
    let isPrivateBrowsing = false;
    try {
        const testKey = "test_private";
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
    } catch {
        isPrivateBrowsing = true;
    }

    // LESS AGGRESSIVE check for limited resources - only for truly low-end devices
    const hasLimitedResources =
        (typeof navigator.hardwareConcurrency !== "undefined" &&
            // Only consider devices with 1-2 cores as truly limited
            navigator.hardwareConcurrency <= 1) ||
        (typeof navigator.deviceMemory !== "undefined" &&
            navigator.deviceMemory < 1);

    if ((isIOS && isPrivateBrowsing) || hasLimitedResources) {
        console.log(
            "Very limited resources or iOS private browsing - using LOW performance mode",
        );
        return true;
    }

    // Desktop detection - make it less aggressive about downgrading
    const isOlderDesktop =
        navigator.hardwareConcurrency <= 3 && // More lenient
        (!navigator.deviceMemory || navigator.deviceMemory <= 2) && // More lenient
        !isIOS &&
        !isIPad;

    if (isOlderDesktop) {
        console.log("Older desktop detected - using MEDIUM performance mode");
        if (currentPerformanceMode === PerformanceMode.AUTO) {
            // Just update the effective mode, preserve AUTO
            autoModeEffectiveMode = PerformanceMode.MEDIUM;
            updateToggleButtonText();
        } else {
            // For manual modes, change the actual mode
            setPerformanceMode(PerformanceMode.MEDIUM);
        }
        return false;
    }

    return false;
}

// Replace getDevicePerformanceTier function with enhanced private browsing detection
function getDevicePerformanceTier(): "high" | "medium" | "low" {
    // Enhanced private browsing detection focused on Safari behavior
    let isPrivateBrowsing = false;

    // Method 1: Storage size detection (Safari private browsing has 0 quota)
    function checkStorageQuota(): boolean {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                navigator.storage.estimate().then((estimate) => {
                    console.log(
                        `Storage quota: ${estimate.quota}, used: ${estimate.usage}`,
                    );
                    if (estimate.quota && estimate.quota < 10000000) {
                        // Less than 10MB
                        console.log("Private browsing likely (small quota)");
                        return true;
                    }
                });
            } catch {}
        }
        return false;
    }

    // Method 2: Safari specific localStorage test - check if data persists
    function checkLocalStoragePersistence(): boolean {
        const TEST_KEY = "private_test_" + Math.random();
        const TEST_VALUE = "test_value_" + Date.now();

        try {
            localStorage.setItem(TEST_KEY, TEST_VALUE);
            // Read back immediately
            const readValue = localStorage.getItem(TEST_KEY);
            localStorage.removeItem(TEST_KEY);

            // In Safari private browsing, the data won't persist between access attempts
            if (readValue !== TEST_VALUE) {
                console.log(
                    "Private browsing detected (non-persistent storage)",
                );
                return true;
            }
        } catch (e) {
            console.log("Error accessing localStorage:", e);
            return true;
        }
        return false;
    }

    // Run tests
    isPrivateBrowsing = checkLocalStoragePersistence() || checkStorageQuota();

    // Additional fallback check
    if (!isPrivateBrowsing && (isSafari || isIOS || isIPad)) {
        try {
            const testKey = "safari_private_test";
            localStorage.setItem(testKey, "1");
            localStorage.removeItem(testKey);
        } catch (e) {
            console.log("Safari private browsing exception caught");
            isPrivateBrowsing = true;
        }
    }

    console.log(`Final private browsing detection: ${isPrivateBrowsing}`);

    // Force LOW tier for ALL iOS devices in private mode
    if (
        (isIOS || isIPad) &&
        (isPrivateBrowsing || (isSafari && checkIsSafariPrivateMode()))
    ) {
        console.log(
            "iOS/iPad Safari private mode - forcing LOW performance tier",
        );
        return "low";
    }

    // Rest remains the same
    if (
        navigator.hardwareConcurrency > 4 ||
        navigator.gpu !== undefined ||
        (isIPad && navigator.hardwareConcurrency > 3 && !isPrivateBrowsing)
    ) {
        return isPrivateBrowsing ? "medium" : "high";
    }

    // Medium performance tier - decent devices
    if (navigator.hardwareConcurrency >= 2) {
        return "medium";
    }

    return "low";
}

// Add this helper function to detect Safari private mode specifically
function checkIsSafariPrivateMode(): boolean {
    const idb = window.indexedDB;
    if (idb) {
        try {
            const test = idb.open("test");
            test.onerror = () => {
                console.log("Safari private mode detected via indexedDB");
                return true;
            };
            return false;
        } catch (e) {
            console.log("Error testing indexedDB:", e);
            return true;
        }
    }
    return false;
}

// Update shouldRender
export function shouldRender(timestamp: number): boolean {
    // Only skip frames during actual racing, not menu screens
    if (
        !isInRaceMode ||
        getEffectivePerformanceMode() !== PerformanceMode.LOW
    ) {
        return true;
    }

    // Frame rate limiting for LOW performance mode during race
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

    // Update the toggle button text whenever performance mode changes
    updateToggleButtonText();
}

/**
 * Update the toggle button text to match current performance mode
 */
function updateToggleButtonText(): void {
    // Only update if button exists
    if (performanceToggleButton) {
        let displayMode;

        // When in AUTO mode, show the effective mode in parentheses
        if (currentPerformanceMode === PerformanceMode.AUTO) {
            displayMode = `${currentPerformanceMode} (${autoModeEffectiveMode})`;
        } else {
            // For manual modes, just show the selected mode
            displayMode = currentPerformanceMode;
        }

        if (isMobileDevice) {
            performanceToggleButton.textContent = `GFX: ${displayMode}`;
        } else {
            performanceToggleButton.innerHTML = `<u>G</u>FX: ${displayMode}`;
        }
    }
}

/**
 * Get current performance mode
 */
export function getPerformanceMode(): PerformanceMode {
    return currentPerformanceMode;
}

/**
 * Auto-configure performance settings based on device capabilities
 * This runs ONCE at startup
 */
export function autoConfigurePerformance(): void {
    // Keep currentPerformanceMode as AUTO
    currentPerformanceMode = PerformanceMode.AUTO;

    // Use performance tier to determine effective mode
    switch (performanceTier) {
        case "high":
            autoModeEffectiveMode = PerformanceMode.HIGH;
            break;
        case "medium":
            autoModeEffectiveMode = PerformanceMode.MEDIUM;
            break;
        case "low":
            autoModeEffectiveMode = PerformanceMode.LOW;
            break;
    }

    // For debugging - log hardware info
    console.log(
        `Detected hardware: Cores: ${navigator.hardwareConcurrency}, Memory: ${navigator.deviceMemory || "unknown"} GB, GPU: ${navigator.gpu ? "yes" : "no"}`,
    );
    console.log(`Performance tier detected: ${performanceTier}`);
    console.log(
        `AUTO mode initialized with effective setting: ${autoModeEffectiveMode}`,
    );
    updateToggleButtonText();
}

/**
 * Initialize graphics settings with one-time detection
 */
export function initializeGraphics(): void {
    console.log("Initializing graphics with performance detection...");

    // Determine performance tier first
    performanceTier = getDevicePerformanceTier();
    console.log(`Detected performance tier: ${performanceTier}`);

    // Run initial benchmark to more aggressively downgrade to MEDIUM if needed
    if (performanceTier === "high") {
        performInitialBenchmark();
    }

    // THEN configure performance based on the detected tier
    autoConfigurePerformance();

    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();

    // Reset race performance check flag
    hasCheckedRacePerformance = false;

    console.log("Performance mode set to:", currentPerformanceMode);
}

/**
 * Run a quick performance benchmark at game startup
 * More aggressively downgrade to MEDIUM for borderline devices
 */
function performInitialBenchmark(): void {
    console.log("Running initial performance benchmark...");

    // Simple render test - create a canvas and do some operations
    const benchmarkCanvas = document.createElement("canvas");
    benchmarkCanvas.width = 400;
    benchmarkCanvas.height = 400;
    const benchmarkCtx = benchmarkCanvas.getContext("2d");

    if (!benchmarkCtx) return;

    // Measure time for a series of drawing operations
    const startTime = performance.now();

    // Perform moderately complex drawing operations
    for (let i = 0; i < 50; i++) {
        benchmarkCtx.clearRect(0, 0, 400, 400);
        benchmarkCtx.save();

        // Draw gradient
        const gradient = benchmarkCtx.createRadialGradient(
            200,
            200,
            10,
            200,
            200,
            200,
        );
        gradient.addColorStop(0, "white");
        gradient.addColorStop(1, "black");
        benchmarkCtx.fillStyle = gradient;
        benchmarkCtx.fillRect(0, 0, 400, 400);

        // Draw some shapes
        for (let j = 0; j < 20; j++) {
            benchmarkCtx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`;
            benchmarkCtx.beginPath();
            benchmarkCtx.arc(
                Math.random() * 400,
                Math.random() * 400,
                Math.random() * 50 + 10,
                0,
                Math.PI * 2,
            );
            benchmarkCtx.fill();
        }

        // Get image data and manipulate pixels
        const imageData = benchmarkCtx.getImageData(0, 0, 400, 400);
        const data = imageData.data;
        for (let p = 0; p < data.length; p += 16) {
            // Sample every 4th pixel
            data[p] = data[p] * 0.9;
            data[p + 1] = data[p + 1] * 0.9;
            data[p + 2] = data[p + 2] * 0.9;
        }
        benchmarkCtx.putImageData(imageData, 0, 0);

        benchmarkCtx.restore();
    }

    const endTime = performance.now();
    const benchmarkTime = endTime - startTime;

    console.log(`Initial benchmark completed in ${benchmarkTime.toFixed(2)}ms`);

    // More aggressive threshold - if higher than this, use MEDIUM by default
    // This threshold is lower than the in-race check
    const benchmarkThreshold = 250; // ms - adjust based on testing

    if (benchmarkTime > benchmarkThreshold) {
        console.log(
            `Initial benchmark indicates potential performance issues (${benchmarkTime.toFixed(2)}ms > ${benchmarkThreshold}ms)`,
        );
        console.log("Setting performance tier to MEDIUM as a precaution");
        performanceTier = "medium";
    } else {
        console.log(
            `Initial benchmark indicates good performance (${benchmarkTime.toFixed(2)}ms < ${benchmarkThreshold}ms)`,
        );
        console.log("Keeping performance tier as HIGH");
    }
}

/**
 * Check performance when race gets going (not just at start)
 */
export function checkPerformanceOnRaceStart(): void {
    // Only check once per race, or if not in AUTO mode
    if (
        hasCheckedRacePerformance ||
        currentPerformanceMode !== PerformanceMode.AUTO
    ) {
        return;
    }

    console.log("Scheduling performance check...");

    // Delay the check to when the game is actively running
    // This ensures we're measuring actual gameplay performance
    setTimeout(() => {
        console.log("Starting performance check for AUTO mode...");
        hasCheckedRacePerformance = true;

        // Use performance tier directly to determine which check to run
        if (performanceTier === "high") {
            performHighTierCheck();
        } else if (performanceTier === "medium") {
            performMediumTierCheck();
        } else {
            performLowTierCheck();
        }
    }, 3000); // Wait 3 seconds after the counting starts before checking
}

/**
 * Reset race-specific performance tracking
 * Call this when a race ends or when restarting
 */
export function resetRacePerformanceCheck(): void {
    hasCheckedRacePerformance = false;
}

// Update the togglePerformanceMode function to use our new helper
export function togglePerformanceMode(): void {
    const modes = [
        PerformanceMode.AUTO, // Add AUTO to the cycle
        PerformanceMode.HIGH,
        PerformanceMode.MEDIUM,
        PerformanceMode.LOW,
    ];
    const currentIndex = modes.indexOf(currentPerformanceMode);
    const nextIndex = (currentIndex + 1) % modes.length;

    // Set mode directly
    currentPerformanceMode = modes[nextIndex];

    // Reset auto mode decision when switching back to AUTO
    if (currentPerformanceMode === PerformanceMode.AUTO) {
        // Re-check performance if in race mode
        if (isInRaceMode) {
            hasCheckedRacePerformance = false;
            checkPerformanceOnRaceStart();
        }
    }

    // Update button text
    updateToggleButtonText();

    // Prevent audio issues
    if (performanceToggleButton) {
        performanceToggleButton.blur();
    }

    console.log("Performance mode toggled to:", currentPerformanceMode);
}

/**
 * Performance check for high-tier devices
 * More sensitive detection to properly downgrade during serious lag
 */
function performHighTierCheck(): void {
    console.log("Running performance check for HIGH tier device...");

    // More sensitive detection method using animationFrame for timing
    let frameCount = 0;
    let slowFrameCount = 0;
    let verySlowFrameCount = 0;
    const MAX_FRAMES = 20; // Check more frames for better detection

    // Lower thresholds to catch more lag
    const moderateLagThreshold = 50; // 50ms = moderate lag (more sensitive)
    const severeLagThreshold = 120; // 120ms = severe lag (more sensitive)

    // Use requestAnimationFrame to get actual render timings
    let lastFrameTime = performance.now();

    function checkFrame(timestamp: number) {
        const frameDuration = timestamp - lastFrameTime;
        lastFrameTime = timestamp;

        // Skip first frame which might be artificially long
        if (frameCount > 0) {
            console.log(
                `Frame ${frameCount} duration: ${frameDuration.toFixed(2)}ms`,
            );

            if (frameDuration > severeLagThreshold) {
                verySlowFrameCount++;
                slowFrameCount++;
                console.log(
                    `SEVERE lag detected: ${frameDuration.toFixed(2)}ms`,
                );
            } else if (frameDuration > moderateLagThreshold) {
                slowFrameCount++;
                console.log(
                    `Moderate lag detected: ${frameDuration.toFixed(2)}ms`,
                );
            }

            if (frameCount >= MAX_FRAMES) {
                // If 25% of frames have SEVERE lag, go straight to LOW
                if (verySlowFrameCount >= 5) {
                    console.log(
                        `SEVERE performance issues detected (${verySlowFrameCount}/${MAX_FRAMES} very slow frames)`,
                    );
                    autoModeEffectiveMode = PerformanceMode.LOW;
                    updateToggleButtonText();
                }
                // If 25% of frames have moderate lag, go to MEDIUM
                else if (slowFrameCount >= 5) {
                    console.log(
                        `Moderate performance issues detected (${slowFrameCount}/${MAX_FRAMES} slow frames)`,
                    );
                    autoModeEffectiveMode = PerformanceMode.MEDIUM;
                    updateToggleButtonText();

                    // Run a follow-up check after 2 seconds to see if we need to go to LOW
                    setTimeout(() => {
                        performAdditionalCheck();
                    }, 2000);
                } else {
                    console.log(
                        `Performance acceptable (${slowFrameCount}/${MAX_FRAMES} slow frames)`,
                    );
                }
                return;
            }
        }

        frameCount++;
        requestAnimationFrame(checkFrame);
    }

    // Secondary check to see if we need to further downgrade to LOW
    function performAdditionalCheck() {
        console.log("Performing follow-up performance check...");

        let additionalFrameCount = 0;
        let additionalSlowFrameCount = 0;
        const ADDITIONAL_MAX_FRAMES = 10;

        function checkAdditionalFrame(timestamp: number) {
            const frameDuration = timestamp - lastFrameTime;
            lastFrameTime = timestamp;

            if (additionalFrameCount > 0) {
                console.log(
                    `Additional frame ${additionalFrameCount} duration: ${frameDuration.toFixed(2)}ms`,
                );

                if (frameDuration > moderateLagThreshold) {
                    additionalSlowFrameCount++;
                }

                if (additionalFrameCount >= ADDITIONAL_MAX_FRAMES) {
                    // If still seeing lag in MEDIUM mode, drop to LOW
                    if (additionalSlowFrameCount >= 3) {
                        console.log(
                            `Continued performance issues in MEDIUM mode (${additionalSlowFrameCount}/${ADDITIONAL_MAX_FRAMES} slow frames)`,
                        );
                        autoModeEffectiveMode = PerformanceMode.LOW;
                        updateToggleButtonText();
                    }
                    return;
                }
            }

            additionalFrameCount++;
            requestAnimationFrame(checkAdditionalFrame);
        }

        lastFrameTime = performance.now();
        requestAnimationFrame(checkAdditionalFrame);
    }

    // Start checking frames
    requestAnimationFrame(checkFrame);
}

/**
 * Performance check for medium-tier devices
 * Balanced approach, may downgrade to LOW if necessary
 */
function performMediumTierCheck(): void {
    console.log("Running performance check for MEDIUM tier device...");
    const firstCheckTime = performance.now();

    // Medium thresholds - reasonably balanced
    const significantIssueThreshold = 150;

    setTimeout(() => {
        const now = performance.now();
        const frameTime = now - firstCheckTime;
        console.log(
            `Medium tier check: Frame time = ${frameTime.toFixed(2)}ms`,
        );

        if (frameTime > significantIssueThreshold) {
            console.log("Significant performance issues on medium-tier device");
            autoModeEffectiveMode = PerformanceMode.LOW;
            updateToggleButtonText();
        } else {
            console.log("Medium-tier device performance is acceptable");
            // Keep MEDIUM mode
        }
    }, 300);
}

/**
 * Performance check for low-tier devices
 * Already using LOW settings, but confirm it's appropriate
 */
function performLowTierCheck(): void {
    console.log("Running performance check for LOW tier device...");

    // Low-tier devices start with LOW mode by default
    autoModeEffectiveMode = PerformanceMode.LOW;
    updateToggleButtonText();

    // No additional checks needed - we assume LOW is appropriate
    console.log("Set to LOW performance mode for low-tier device");
}

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

// Update the visual effect functions to check race mode

export const applyCRTEffect = (noisy = true): void => {
    const width = canvas.width;
    const height = canvas.height;

    let effectiveMode;

    // Get base effective mode (resolve AUTO first)
    const baseMode = getEffectivePerformanceMode();

    if (isInRaceMode) {
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

// Update applyGradient
export const applyGradient = () => {
    // Only apply performance optimization during actual racing
    const effectiveMode = isInRaceMode
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

// Update applyGrayscale
export const applyGrayscale = () => {
    // Only apply performance optimization during actual racing
    const effectiveMode = isInRaceMode
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

    return button;
}

// Replace the click listener in createToggleButton
export const createToggleButton = () => {
    performanceToggleButton = document.createElement("button");

    if (performanceToggleButton) {
        let displayMode;

        // When in AUTO mode, show the effective mode in parentheses
        if (currentPerformanceMode === PerformanceMode.AUTO) {
            displayMode = `${currentPerformanceMode} (${autoModeEffectiveMode})`;
        } else {
            // For manual modes, just show the selected mode
            displayMode = currentPerformanceMode;
        }

        if (isMobileDevice) {
            performanceToggleButton.textContent = `GFX: ${displayMode}`;
        } else {
            performanceToggleButton.innerHTML = `<u>G</u>FX: ${displayMode}`;
        }
    }

    // Style the button
    performanceToggleButton.style.position = "absolute";
    performanceToggleButton.style.top = "10px";
    performanceToggleButton.style.left = isIPad ? "100px" : "10px";
    performanceToggleButton.style.fontFamily = "Impact";
    performanceToggleButton.style.height = buttonStyles.size;
    performanceToggleButton.style.color = buttonStyles.color;
    performanceToggleButton.style.background = buttonStyles.background;
    performanceToggleButton.style.border = buttonStyles.border;
    performanceToggleButton.style.borderRadius = buttonStyles.borderRadius;
    performanceToggleButton.style.fontSize = buttonStyles.fontSize;
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
    // Add keyboard listener for keys on desktop
    if (!isMobileDevice) {
        document.addEventListener("keydown", (e) => {
            // 'g' key for "Graphics"
            if (e.key === "g" || e.key === "m" || e.key === "F1") {
                togglePerformanceMode();
            }
        });
    }
}
