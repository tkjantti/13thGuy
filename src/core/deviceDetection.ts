// Browser/device detection
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
