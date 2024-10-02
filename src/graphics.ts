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

    for (let y = 0; y < height; y++) {
        const isScanline = (y & 1) === 0;
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            let r = data[index];
            let g = data[index + 1];
            let b = data[index + 2];

            // Apply scanlines
            if (isScanline) {
                r *= opacity;
                g *= opacity;
                b *= opacity;
            }

            // Apply noise
            if (noisy && noiseValues) {
                const noise = noiseValues[y * width + x];
                r += noise;
                g += noise;
                b += noise;
            }

            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
        }
    }

    cx.putImageData(imageData, 0, 0);
};

export const applyGradient = (track = false) => {
    const width = canvas.width;
    const height = canvas.height;
    const gradient = cx.createRadialGradient(
        width / 2,
        height / 2,
        0, // Inner circle
        width / 2,
        height / 2,
        width / 2, // Outer circle
    );
    if (track) {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.1");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    } else {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    }

    cx.fillStyle = gradient;
    cx.fillRect(0, 0, width, height);
};

export const cx: CanvasRenderingContext2D = canvas.getContext("2d", {
    willReadFrequently: true,
})!;

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
