// Import device detection from a shared utility file
import { isIPad, isSafari, isIOS, isMobileDevice } from "./deviceDetection";

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

/**
 * Performance mode settings
 */
export enum PerformanceMode {
    AUTO = "auto",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low",
}

// Performance state
let currentPerformanceMode: PerformanceMode = PerformanceMode.AUTO;
let autoModeEffectiveMode: PerformanceMode = PerformanceMode.HIGH;
export let performanceTier: "high" | "medium" | "low";
let hasCheckedRacePerformance = false;
let isInRaceMode = false;
let performanceToggleButton: HTMLButtonElement | null = null;

// Frame timing
export const LOW_PERFORMANCE_FPS = 60;
let lastFrameTime = 0;

/**
 * Set whether the game is currently in race mode vs menus/start screens
 */
export function setRaceMode(inRace: boolean): void {
    isInRaceMode = inRace;
    console.log(`Race mode set to: ${inRace ? "ACTIVE" : "INACTIVE"}`);
}

/**
 * Get effective performance mode (resolves AUTO to actual mode)
 */
export function getEffectivePerformanceMode(): PerformanceMode {
    if (currentPerformanceMode === PerformanceMode.AUTO) {
        return autoModeEffectiveMode;
    }
    return currentPerformanceMode;
}

/**
 * Unified private browsing detection that combines all checks
 * Returns detailed information about the private browsing state
 */
export function detectPrivateBrowsing(): {
    isPrivate: boolean;
    isIpadSafariPrivate: boolean;
    isIOSPrivate: boolean;
} {
    // Default result
    const result = {
        isPrivate: false,
        isIpadSafariPrivate: false,
        isIOSPrivate: false,
    };

    // iPad Safari specific check (highest priority)
    if (isIPad && isSafari) {
        try {
            window.localStorage.setItem("ipad_private_test", "test");
            window.localStorage.removeItem("ipad_private_test");
            console.log("iPad Safari NOT in private mode");
        } catch (e) {
            console.log("iPad Safari private mode detected");
            result.isPrivate = true;
            result.isIpadSafariPrivate = true;
            return result; // Early exit - this is very reliable
        }
    }

    // Direct iOS check
    if (isIOS) {
        try {
            localStorage.setItem("ios_private_test", "test");
            localStorage.removeItem("ios_private_test");
            console.log("iOS NOT in private mode");
        } catch (e) {
            console.log("iOS private mode detected");
            result.isPrivate = true;
            result.isIOSPrivate = true;
            return result; // Early exit - also reliable
        }
    }

    // General localStorage test (works on most browsers)
    try {
        localStorage.setItem("private_test", "private_test");
        localStorage.removeItem("private_test");
    } catch (e) {
        console.log("Private browsing detected via localStorage exception");
        result.isPrivate = true;
        return result;
    }

    // Additional checks for Safari
    if (isSafari || isIOS || isIPad) {
        // IndexedDB check for Safari
        const idb = window.indexedDB;
        if (idb) {
            try {
                const test = idb.open("test");
                test.onerror = () => {
                    console.log("Safari private mode detected via indexedDB");
                    result.isPrivate = true;
                };
            } catch (e) {
                console.log("Error testing indexedDB:", e);
            }
        }

        // Check storage persistence
        const TEST_KEY = "private_test_" + Math.random();
        const TEST_VALUE = "test_value_" + Date.now();
        try {
            localStorage.setItem(TEST_KEY, TEST_VALUE);
            const readValue = localStorage.getItem(TEST_KEY);
            localStorage.removeItem(TEST_KEY);
            if (readValue !== TEST_VALUE) {
                console.log(
                    "Private browsing detected (non-persistent storage)",
                );
                result.isPrivate = true;
            }
        } catch (e) {
            // Already handled by general localStorage test
        }
    }

    // Also start async storage quota check
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage
            .estimate()
            .then((estimate) => {
                if (estimate.quota && estimate.quota < 10000000) {
                    console.log(
                        "Private browsing detected via storage quota:",
                        estimate.quota,
                    );
                    if (
                        performanceTier === "high" &&
                        autoModeEffectiveMode === PerformanceMode.HIGH
                    ) {
                        autoModeEffectiveMode = PerformanceMode.MEDIUM;
                        updateToggleButtonText();
                    }
                }
            })
            .catch((e) => console.log("Storage quota check error:", e));
    }

    return result;
}

/**
 * Device performance tier detection
 */
export function getDevicePerformanceTier(): "high" | "medium" | "low" {
    // Run unified private browsing detection
    const privateResult = detectPrivateBrowsing();

    // Handle iPad Safari private mode immediately
    if (privateResult.isIpadSafariPrivate) {
        console.log(
            "iPad Safari private mode detected immediately - forcing LOW tier",
        );
        return "low";
    }

    // Handle iOS private mode immediately
    if (privateResult.isIOSPrivate) {
        console.log("iOS private mode detected immediately - forcing LOW tier");
        return "low";
    }

    // Force LOW tier for ALL iOS devices in private mode
    if ((isIOS || isIPad) && privateResult.isPrivate) {
        console.log(
            "iOS/iPad device in private mode - forcing LOW performance tier",
        );
        return "low";
    }

    // Rest remains the same
    if (
        navigator.hardwareConcurrency > 4 ||
        navigator.gpu !== undefined ||
        (isIPad &&
            navigator.hardwareConcurrency > 3 &&
            !privateResult.isPrivate)
    ) {
        return privateResult.isPrivate ? "medium" : "high";
    }

    // Medium performance tier - decent devices
    if (navigator.hardwareConcurrency >= 2) {
        return "medium";
    }

    return "low";
}

/**
 * Checks if the device is low performance
 */
export function detectLowPerformanceMode(): boolean {
    const privateResult = detectPrivateBrowsing();

    // Handle iPad Safari private mode immediately
    if (privateResult.isIpadSafariPrivate) {
        console.log("iPad Safari private mode - using LOW performance mode");
        return true;
    }

    // LESS AGGRESSIVE check for limited resources - only for truly low-end devices
    const hasLimitedResources =
        (typeof navigator.hardwareConcurrency !== "undefined" &&
            navigator.hardwareConcurrency <= 1) ||
        (typeof navigator.deviceMemory !== "undefined" &&
            navigator.deviceMemory < 1);

    if ((isIOS && privateResult.isPrivate) || hasLimitedResources) {
        console.log(
            "Very limited resources or iOS private browsing - using LOW performance mode",
        );
        return true;
    }

    // Desktop detection - make it less aggressive about downgrading
    const isOlderDesktop =
        navigator.hardwareConcurrency <= 3 &&
        (!navigator.deviceMemory || navigator.deviceMemory <= 2) &&
        !isIOS &&
        !isIPad;

    if (isOlderDesktop) {
        console.log("Older desktop detected - using MEDIUM performance mode");
        if (currentPerformanceMode === PerformanceMode.AUTO) {
            autoModeEffectiveMode = PerformanceMode.MEDIUM;
            updateToggleButtonText();
        } else {
            setPerformanceMode(PerformanceMode.MEDIUM);
        }
        return false;
    }

    return false;
}

/**
 * Should render the current frame based on performance settings
 */
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
 * Update the toggle button text to match current performance mode
 */
function updateToggleButtonText(): void {
    // Only update if button exists
    if (performanceToggleButton) {
        let displayMode;

        // When in AUTO mode, show the effective mode in parentheses with single letter
        if (currentPerformanceMode === PerformanceMode.AUTO) {
            const shortEffectiveMode = getShortModeName(autoModeEffectiveMode);
            displayMode = `auto (${shortEffectiveMode})`;
        } else {
            // For manual modes, just show the full selected mode name
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
 * Get short mode abbreviation for modes
 */
function getShortModeName(mode: PerformanceMode): string {
    switch (mode) {
        case PerformanceMode.HIGH:
            return "H";
        case PerformanceMode.MEDIUM:
            return "M";
        case PerformanceMode.LOW:
            return "L";
        default:
            return mode;
    }
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
 * Get current performance mode
 */
export function getPerformanceMode(): PerformanceMode {
    return currentPerformanceMode;
}

/**
 * Export functions for UI integration
 */
export function setPerformanceToggleButton(button: HTMLButtonElement): void {
    performanceToggleButton = button;
    updateToggleButtonText();
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

/**
 * Performance check for high-tier devices
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
 */
function performLowTierCheck(): void {
    console.log("Running performance check for LOW tier device...");

    // Low-tier devices start with LOW mode by default
    autoModeEffectiveMode = PerformanceMode.LOW;
    updateToggleButtonText();

    // No additional checks needed - we assume LOW is appropriate
    console.log("Set to LOW performance mode for low-tier device");
}

/**
 * Toggle between performance modes
 */
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

// Add keyboard shortcuts
export function initializeKeyboardShortcuts(): void {
    // Add keyboard listener for keys on desktop
    if (!isMobileDevice) {
        document.addEventListener("keydown", (e) => {
            // 'g' key for "Graphics"
            if (e.code === "KeyG" || e.code === "F1") {
                togglePerformanceMode();
            }
        });
    }
}

export function getIsInRaceMode(): boolean {
    return isInRaceMode;
}
