let gradient: CanvasGradient;

const createGradient = (
    canvas: HTMLCanvasElement,
    cx: CanvasRenderingContext2D,
): CanvasGradient => {
    const width = canvas.width;
    const height = canvas.height;

    const result = cx.createRadialGradient(
        width / 2,
        height / 2,
        0, // Inner circle
        width / 2,
        height / 2,
        width / 2, // Outer circle
    );

    result.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    result.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    return result;
};

export const renderGradient = (
    canvas: HTMLCanvasElement,
    cx: CanvasRenderingContext2D,
) => {
    if (!gradient) {
        gradient = createGradient(canvas, cx);
    }
    cx.fillStyle = gradient;
    cx.fillRect(0, 0, canvas.width, canvas.height);
};
