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

import { easeInOutQuad, easeInOutSine } from "./easings";
import { triangle } from "./sequences";

export enum CharacterAnimation {
    Stand,
    Walk,
    Fall,
    Celebrate,
}

export enum CharacterFacingDirection {
    Right,
    Forward,
    Backward,
    ForwardRight,
    BackwardRight,
}

enum HorizontalDirection {
    Left = -1,
    Right = 1,
}

const faceColor = "rgb(200,150,150)";
const eyeColor = "rgb(230,230,230)";
const pupilColor = "rgb(30,0,0)";
const noseColor = "rgb(170,120,120)";

const LegColor = "rgb(140,140,140)";
const LegColorDarker = "rgb(120,120,120)";
const ArmColor = "rgb(140,140,220)";
const ArmColorDarker = "rgb(120,120,200)";

const shadowColor = "rgba(0, 0, 0, 0.2";

export function renderCharacter(
    cx: CanvasRenderingContext2D,
    color: string,
    w: number,
    h: number,
    t: number,
    direction: CharacterFacingDirection,
    animation: CharacterAnimation,
    pattern?: CanvasPattern | null,
    noCache?: boolean,
): void {
    let period = 0;
    let leg1Angle = 0;
    let leg2Angle = 0;
    let arm1Angle = 0;
    let arm2Angle = 0;
    let bouncing = 0;

    const verticalDirection =
        direction === CharacterFacingDirection.ForwardRight ||
        direction === CharacterFacingDirection.BackwardRight;

    const rightDirection = direction === CharacterFacingDirection.Right;

    switch (animation) {
        case CharacterAnimation.Walk:
            period = rightDirection ? 400 : verticalDirection ? 300 : 250;
            bouncing = easeInOutSine(triangle(period / 2, t / 2)) * 0.015 * h;
            leg1Angle = arm2Angle =
                -Math.PI / 8 +
                easeInOutQuad(triangle(period, t)) * (Math.PI / 4);

            leg2Angle = arm1Angle =
                -Math.PI / 8 +
                easeInOutQuad(triangle(period, t + period / 2)) * (Math.PI / 4);
            break;
        case CharacterAnimation.Celebrate: {
            period = 1500;
            bouncing = easeInOutSine(triangle(period / 2, t / 2)) * 0.15 * h;
            const amount = triangle(period, t);
            leg1Angle = easeInOutQuad(amount) * Math.PI * (1 / 8);
            leg2Angle = -easeInOutQuad(amount) * Math.PI * (3 / 8);
            arm2Angle =
                Math.PI * (1 / 8) - easeInOutQuad(amount) * Math.PI * (9 / 8);
            arm1Angle =
                Math.PI * (1 / 8) - easeInOutQuad(amount) * Math.PI * (10 / 8);
            break;
        }
        case CharacterAnimation.Fall:
            period = 3200;
            bouncing = easeInOutSine(triangle(period / 2, t)) * 0.02 * h;
            leg1Angle =
                -Math.PI * (3 / 8) +
                easeInOutQuad(triangle(period, t)) * (Math.PI * (3 / 4));

            leg2Angle =
                -Math.PI * (3 / 8) +
                easeInOutQuad(triangle(period, t + period / 2)) *
                    (Math.PI * (3 / 4));

            arm1Angle =
                -Math.PI * (8 / 8) +
                easeInOutQuad(triangle(period, t + period / 2)) * (Math.PI / 4);

            arm2Angle =
                -Math.PI * (8 / 8) +
                easeInOutQuad(triangle(period, t)) * (Math.PI / 4);
            break;
        default:
            break;
    }

    cx.save();

    renderShadow(cx, 0.5 * w, h, w * 0.4 - bouncing / 2);

    cx.translate(0, -bouncing);

    const armLength = 0.3 * h;
    const legLength = 0.25 * h;
    const torsoLength = 0.4 * h;

    const limbWidth = 0.2 * w;
    const armWidth = 0.1 * w;

    const headHeight = 0.25 * h;
    const headDepth = 0.5 * w;
    const headWidth = 0.45 * w;
    const headRounding = 0.2 * w;
    const torsoRounding = 0.2 * w;

    const faceMargin = 0.15 * w; // How much face is smaller than head
    const faceRounding = 0.6 * headRounding;
    const faceWidth = headWidth - faceMargin;
    const faceHeight = headHeight - faceMargin * 1.75;
    const faceY = headHeight - faceHeight;

    const torsoWidth = 0.6 * w;
    const torsoDepth = 0.5 * w;

    cx.fillStyle = color;
    cx.lineWidth = limbWidth;
    // Rounded lines
    cx.lineJoin = "round";
    cx.lineCap = "round";

    if (color === "gray") cx.globalAlpha = 0.7; // Eliminated color, use opacity to character

    switch (direction) {
        case CharacterFacingDirection.Right:
            {
                const armX = 0.5 * w;
                const armY = 0.4 * h;

                const legX = 0.5 * w;
                const legY = 0.7 * h;

                renderArmSideways(
                    cx,
                    ArmColorDarker,
                    armX,
                    armY,
                    armWidth,
                    armLength,
                    arm1Angle,
                );
                renderLegSideways(
                    cx,
                    LegColorDarker,
                    legX,
                    legY,
                    limbWidth,
                    legLength,
                    leg1Angle,
                );
                renderLegSideways(
                    cx,
                    LegColor,
                    legX,
                    legY,
                    limbWidth,
                    legLength,
                    leg2Angle,
                );
                renderHead(
                    direction,
                    cx,
                    w,
                    headHeight,
                    headDepth,
                    headHeight,
                    headRounding,
                    color,
                    pattern,
                    noCache,
                );
                renderTorso(
                    direction,
                    cx,
                    w,
                    h,
                    torsoDepth,
                    torsoLength,
                    torsoRounding,
                    color,
                    pattern,
                    noCache,
                );
                renderArmSideways(
                    cx,
                    ArmColor,
                    armX,
                    armY,
                    armWidth,
                    armLength,
                    arm2Angle,
                );
            }
            break;
        case CharacterFacingDirection.Forward:
        case CharacterFacingDirection.Backward: {
            renderLegFacing(
                cx,
                LegColor,
                0.35 * w,
                0.7 * h,
                limbWidth,
                legLength,
                HorizontalDirection.Left,
                leg1Angle,
                0,
            );
            renderLegFacing(
                cx,
                LegColor,
                0.7 * w,
                0.7 * h,
                limbWidth,
                legLength,
                HorizontalDirection.Right,
                leg2Angle,
                0,
            );
            // Render head before arms so that celebration animation looks good
            // when shown in the backward direction.
            renderHead(
                direction,
                cx,
                w,
                headHeight,
                headWidth,
                headHeight,
                headRounding,
                color,
                pattern,
                noCache,
            );
            if (direction === CharacterFacingDirection.Backward) {
                const faceX = (w - faceWidth) / 2;
                renderFace(
                    cx,
                    faceX,
                    faceY,
                    faceWidth,
                    faceHeight,
                    faceRounding,
                );
            }
            renderArmFacing(
                cx,
                ArmColor,
                0.25 * w,
                0.35 * h,
                armWidth,
                armLength,
                HorizontalDirection.Left,
                arm1Angle,
            );
            renderArmFacing(
                cx,
                ArmColor,
                0.75 * w,
                0.35 * h,
                armWidth,
                armLength,
                HorizontalDirection.Right,
                arm2Angle,
            );
            renderTorso(
                direction,
                cx,
                w,
                h,
                torsoWidth,
                torsoLength,
                torsoRounding,
                color,
                pattern,
                noCache,
            );

            break;
        }
        case CharacterFacingDirection.ForwardRight: {
            renderLegFacing(
                cx,
                LegColorDarker,
                0.35 * w,
                0.7 * h,
                limbWidth,
                legLength,
                HorizontalDirection.Left,
                leg1Angle,
                leg2Angle / 4,
            );
            renderLegFacing(
                cx,
                LegColor,
                0.65 * w,
                0.7 * h,
                limbWidth,
                legLength,
                HorizontalDirection.Right,
                leg2Angle,
                leg2Angle / 4,
            );
            renderArmFacing(
                cx,
                ArmColorDarker,
                0.25 * w,
                0.35 * h,
                armWidth,
                armLength,
                HorizontalDirection.Left,
                arm2Angle,
                arm2Angle / 2,
            );
            renderHead(
                direction,
                cx,
                w,
                headHeight,
                headDepth,
                headHeight,
                headRounding,
                color,
                pattern,
                noCache,
            );
            renderTorso(
                direction,
                cx,
                w,
                h,
                torsoWidth,
                torsoLength,
                torsoRounding,
                color,
                pattern,
                noCache,
            );
            renderArmFacing(
                cx,
                ArmColor,
                0.75 * w,
                0.35 * h,
                armWidth,
                armLength,
                HorizontalDirection.Right,
                arm1Angle,
                arm2Angle / 2,
            );
            break;
        }
        case CharacterFacingDirection.BackwardRight: {
            renderLegFacing(
                cx,
                LegColorDarker,
                0.65 * w,
                0.7 * h,
                limbWidth,
                legLength,
                HorizontalDirection.Right,
                leg2Angle,
                leg2Angle / 4,
            );
            renderLegFacing(
                cx,
                LegColor,
                0.35 * w,
                0.7 * h,
                limbWidth,
                legLength,
                HorizontalDirection.Left,
                leg1Angle,
                leg2Angle / 4,
            );
            renderArmFacing(
                cx,
                ArmColorDarker,
                0.75 * w,
                0.35 * h,
                armWidth,
                armLength,
                HorizontalDirection.Right,
                arm2Angle,
                arm2Angle / 2,
            );
            renderHead(
                direction,
                cx,
                w,
                headHeight,
                headWidth,
                headHeight,
                headRounding,
                color,
                pattern,
                noCache,
            );
            renderTorso(
                direction,
                cx,
                w,
                h,
                torsoWidth,
                torsoLength,
                torsoRounding,
                color,
                pattern,
                noCache,
            );
            renderArmFacing(
                cx,
                ArmColor,
                0.25 * w,
                0.35 * h,
                armWidth,
                armLength,
                HorizontalDirection.Left,
                arm1Angle,
                arm2Angle / 2,
            );

            const faceX = (w - faceWidth) / 2 + (headWidth - faceWidth) / 2;
            renderFace(cx, faceX, faceY, faceWidth, faceHeight, faceRounding);
            break;
        }
        default:
            break;
    }

    cx.restore();
}

function renderShadow(
    cx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
): void {
    cx.save();
    cx.fillStyle = shadowColor;
    cx.translate(x, y);
    cx.beginPath();
    cx.arc(0, 0, Math.max(0, radius), 0, 2 * Math.PI);
    cx.fill();
    cx.restore();
}

// Caching of character gradients

type HeadOrTorsoKey = "TORSO" | "HEAD";

const gradients: Record<
    string,
    CanvasGradient | CanvasPattern | null | undefined
> = {};

function blendColors(
    baseColor: string,
    overlayColor: string,
    overlayAlpha: number,
): string {
    const base = parseColor(baseColor);
    const overlay = parseColor(overlayColor);

    const r = Math.round(
        (1 - overlayAlpha) * base.r + overlayAlpha * overlay.r,
    );
    const g = Math.round(
        (1 - overlayAlpha) * base.g + overlayAlpha * overlay.g,
    );
    const b = Math.round(
        (1 - overlayAlpha) * base.b + overlayAlpha * overlay.b,
    );

    return `rgb(${r}, ${g}, ${b})`;
}

function parseColor(color: string): { r: number; g: number; b: number } {
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(color);
    return result
        ? {
              r: parseInt(result[1]),
              g: parseInt(result[2]),
              b: parseInt(result[3]),
          }
        : { r: 0, g: 0, b: 0 };
}

const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");

function getCharacterGradient(
    cx: CanvasRenderingContext2D,
    baseColor: string,
    key: HeadOrTorsoKey,
    w: number,
    h: number,
    noCache: boolean,
): CanvasGradient | CanvasPattern | null | undefined {
    const HeadOrTorsoKey = `${key}-${baseColor}-${w}-${h}`;
    if (noCache || !gradients[HeadOrTorsoKey]) {
        const gradient = cx.createRadialGradient(w, h, h / 8, w, h, w);
        if (key === "TORSO") {
            gradient.addColorStop(
                0,
                blendColors(baseColor, "rgb(255, 255, 255)", 0.1),
            );
            gradient.addColorStop(
                0.2,
                blendColors(baseColor, "rgb(255, 255, 255)", 0.1),
            );
            gradient.addColorStop(
                0.5,
                blendColors(baseColor, "rgb(0, 0, 0)", 0.1),
            );
            gradient.addColorStop(
                1,
                blendColors(baseColor, "rgb(0, 0, 0)", 0.3),
            );
        } else if (key === "HEAD") {
            gradient.addColorStop(
                0,
                blendColors(baseColor, "rgb(0, 0, 0)", 0.3),
            );
            gradient.addColorStop(
                0.5,
                blendColors(baseColor, "rgb(0, 0, 0)", 0.1),
            );
            gradient.addColorStop(
                0.8,
                blendColors(baseColor, "rgb(255, 255, 255)", 0.1),
            );
            gradient.addColorStop(
                1,
                blendColors(baseColor, "rgb(255, 255, 255)", 0.1),
            );
        }

        // Firefox is slow with gradients so use patterns instead
        if (isFirefox) {
            if (noCache)
                return createGradientPattern(cx, gradient, w * 2, h * 2);

            gradients[HeadOrTorsoKey] = createGradientPattern(
                cx,
                gradient,
                w * 2,
                h * 4,
            );
        } else {
            if (noCache) return gradient;
            gradients[HeadOrTorsoKey] = gradient;
        }
    }

    return gradients[HeadOrTorsoKey];
}

export function clearCharacterGradientCache(): void {
    for (const key in gradients) {
        delete gradients[key];
    }
}

function createGradientPattern(
    cx: CanvasRenderingContext2D,
    gradient: CanvasGradient,
    w: number,
    h: number,
) {
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = w;
    offscreenCanvas.height = h;
    const offscreenCtx = offscreenCanvas.getContext("2d");

    if (!offscreenCtx) return;

    offscreenCtx.fillStyle = gradient;
    offscreenCtx.fillRect(0, 0, w, h);

    return cx.createPattern(offscreenCanvas, "no-repeat");
}

function renderTorso(
    direction: CharacterFacingDirection,
    cx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rounding: number,
    color: string,
    pattern?: CanvasPattern | null,
    noCache?: boolean,
): void {
    const locationX =
        direction === CharacterFacingDirection.Forward ||
        CharacterFacingDirection.Backward
            ? 0.2 * x
            : 0.5 * (x - w);
    const locationY = 0.3 * y;

    cx.beginPath();
    cx.roundRect(locationX, locationY, w, h, rounding);
    if (color !== "gray") {
        const gradient = getCharacterGradient(
            cx,
            color,
            "TORSO",
            w,
            h,
            noCache || false,
        );

        cx.fillStyle = gradient || "black";
    }
    cx.fill();

    if (pattern) {
        cx.save();
        cx.translate(locationX, locationY);
        cx.scale(w / 80, h / 80);
        cx.fillStyle = pattern;
        cx.fill();
        cx.restore();
    }
}

function renderHead(
    direction: CharacterFacingDirection,
    cx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rounding: number,
    color: string,
    pattern?: CanvasPattern | null,
    noCache?: boolean,
): void {
    const locationX =
        direction === CharacterFacingDirection.Right ? 0.2 * x : 0.5 * (x - w);
    const locationY = 0.25 * y;

    cx.beginPath();
    cx.roundRect(locationX, locationY, w, h, rounding);
    if (color !== "gray") {
        const gradient = getCharacterGradient(
            cx,
            color,
            "HEAD",
            w,
            h,
            noCache || false,
        );

        cx.fillStyle = gradient || "black";
    }
    cx.fill();

    if (pattern) {
        cx.save();
        cx.translate(locationX, locationY);
        cx.scale(w / 80, h / 80);
        cx.fillStyle = pattern;
        cx.fill();
        cx.restore();
    }
}

function renderArmSideways(
    cx: CanvasRenderingContext2D,
    style: string,
    x: number,
    y: number,
    w: number,
    length: number,
    angle: number,
): void {
    cx.save();
    cx.strokeStyle = style;
    cx.lineWidth = w;
    cx.translate(x, y);
    cx.rotate(angle);
    cx.beginPath();
    cx.moveTo(0, 0);
    cx.quadraticCurveTo(-length / 4, length / 2, 0, length);
    cx.stroke();
    cx.restore();
}

function renderLegSideways(
    cx: CanvasRenderingContext2D,
    style: string,
    x: number,
    y: number,
    w: number,
    length: number,
    angle: number,
): void {
    cx.save();
    cx.strokeStyle = style;
    cx.lineWidth = w;
    cx.translate(x, y);
    cx.rotate(angle);
    cx.beginPath();
    cx.moveTo(0, 0);
    cx.quadraticCurveTo(-length / 8, length / 2, 0, length);
    cx.stroke();
    cx.restore();
}

function renderArmFacing(
    cx: CanvasRenderingContext2D,
    style: string,
    x: number,
    y: number,
    w: number,
    length: number,
    bendDirection: HorizontalDirection,
    angle: number,
    sidewaysAngle: number = 0,
): void {
    cx.save();
    cx.strokeStyle = style;
    cx.lineWidth = w;
    cx.translate(x, y);

    // Rotate curved arms a little so that they don't overlap with the body.
    cx.rotate(-bendDirection * 0.07 * Math.PI);

    cx.rotate(sidewaysAngle);
    cx.scale(1, Math.cos(angle + Math.PI / 8));
    cx.beginPath();
    cx.moveTo(0, 0);
    cx.quadraticCurveTo((bendDirection * length) / 4, length / 2, 0, length);
    cx.stroke();
    cx.restore();
}

function renderLegFacing(
    cx: CanvasRenderingContext2D,
    style: string,
    x: number,
    y: number,
    w: number,
    length: number,
    bendDirection: HorizontalDirection,
    angle: number,
    sidewaysAngle: number,
): void {
    cx.save();
    cx.strokeStyle = style;
    cx.lineWidth = w;
    cx.translate(x, y);
    cx.rotate(sidewaysAngle);
    cx.scale(1, Math.cos(angle + Math.PI / 8));
    cx.beginPath();
    cx.moveTo(0, 0);
    cx.quadraticCurveTo((bendDirection * length) / 8, length / 2, 0, length);
    cx.stroke();
    cx.restore();
}

function renderFace(
    cx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rounding: number,
): void {
    cx.save();
    cx.translate(x, y);

    cx.shadowColor = "rgba(0, 0, 0, 0.5)";

    // Face
    cx.fillStyle = faceColor;
    cx.shadowOffsetY = -h / 10;
    const faceX = 0;
    const faceY = 0;

    cx.beginPath();
    cx.roundRect(faceX, faceY, w, h, rounding);
    cx.fill();
    cx.closePath();

    cx.shadowOffsetY = 0;

    // Eyes
    const eyeRadius = 0.06 * w;
    const eyeXOffset = w / 4;
    const eyeYOffset = h / 3;
    const leftEyeX = faceX + eyeXOffset;
    const rightEyeX = faceX + w - eyeXOffset;
    const eyeY = faceY + eyeYOffset;

    cx.fillStyle = eyeColor;
    cx.beginPath();
    cx.arc(leftEyeX, eyeY, eyeRadius, 0, Math.PI * 2);
    cx.arc(rightEyeX, eyeY, eyeRadius, 0, Math.PI * 2);
    cx.fill();
    cx.closePath();

    // Pupils
    const pupilRadius = 0.025 * w;
    const pupilXOffset = 0.01 * w;
    const pupilYOffset = 0.01 * h;

    cx.fillStyle = pupilColor;
    cx.beginPath();
    cx.arc(
        leftEyeX + pupilXOffset,
        eyeY + pupilYOffset,
        pupilRadius,
        0,
        Math.PI * 2,
    );
    cx.arc(
        rightEyeX + pupilXOffset,
        eyeY + pupilYOffset,
        pupilRadius,
        0,
        Math.PI * 2,
    );
    cx.fill();
    cx.closePath();

    // Nose
    const noseWidth = 0.15 * w;
    const noseHeight = 0.2 * h;
    const noseX = faceX + (w - noseWidth) / 1.75;
    const noseY = faceY + (h - noseHeight) / 1.5;

    cx.fillStyle = noseColor;
    cx.beginPath();
    cx.moveTo(noseX, noseY);
    cx.lineTo(noseX + noseWidth / 2, noseY + noseHeight);
    cx.lineTo(noseX - noseWidth / 2, noseY + noseHeight);
    cx.closePath();
    cx.fill();

    cx.restore();
}
