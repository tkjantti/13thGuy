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
}

export enum CharacterFacingDirection {
    Right,
    Forward,
    Backward,
    ForwardRight,
    BackwardRight,
}

const faceColor = "rgb(200,150,150)";
const eyeColor = "rgb(230,230,230)";
const pupilColor = "rgb(30,0,0)";
const noseColor = "rgb(170,120,120)";

const LegColor = "rgb(140,140,140)";
const LegColorDarker = "rgb(120,120,120)";
const ArmColor = "rgb(140,140,220)";
const ArmColorDarker = "rgb(120,120,200)";

export function renderCharacter(
    cx: CanvasRenderingContext2D,
    color: string,
    w: number,
    h: number,
    t: number,
    direction: CharacterFacingDirection,
    animation: CharacterAnimation,
): void {
    let period = 0;
    let leg1Angle = 0;
    let leg2Angle = 0;
    let arm1Angle = 0;
    let arm2Angle = 0;
    let bouncing = 0;

    switch (animation) {
        case CharacterAnimation.Stand:
            period = 800;
            bouncing = easeInOutSine(triangle(period / 2, t)) * 0.04 * h;
            break;
        case CharacterAnimation.Walk:
            period = 250;
            bouncing = easeInOutSine(triangle(period / 2, t / 2)) * 0.015 * h;
            leg1Angle = arm2Angle =
                -Math.PI / 8 +
                easeInOutQuad(triangle(period, t)) * (Math.PI / 4);

            leg2Angle = arm1Angle =
                -Math.PI / 8 +
                easeInOutQuad(triangle(period, t + period / 2)) * (Math.PI / 4);
            break;
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
    }

    cx.save();
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

    const torsoWidth = 0.6 * w;
    const torsoDepth = 0.5 * w;

    cx.fillStyle = color;
    cx.lineWidth = limbWidth;
    // Rounded lines
    cx.lineJoin = "round";
    cx.lineCap = "round";

    cx.shadowOffsetY = 10;
    cx.shadowBlur = 10;
    cx.shadowColor = "rgba(0, 0, 0, 0.5)";

    switch (direction) {
        case CharacterFacingDirection.Right:
            {
                // Arm (back)
                cx.save();
                cx.strokeStyle = ArmColorDarker;
                cx.lineWidth = armWidth;
                cx.translate(0.5 * w, 0.4 * h);
                cx.rotate(arm1Angle);
                cx.rotate((10 * Math.PI) / 180);
                cx.beginPath();
                cx.moveTo(0, 0);
                cx.quadraticCurveTo(
                    -armLength / 4,
                    armLength / 2,
                    0,
                    armLength,
                );
                cx.stroke();
                cx.restore();

                // Leg (back)
                cx.save();
                cx.strokeStyle = LegColorDarker;
                cx.lineWidth = limbWidth;
                cx.translate(0.5 * w, 0.7 * h);
                cx.rotate(leg1Angle);
                cx.beginPath();
                cx.moveTo(0, 0);
                cx.quadraticCurveTo(
                    -legLength / 8,
                    legLength / 2,
                    0,
                    legLength,
                );
                cx.stroke();
                cx.restore();

                // Leg (front)
                cx.save();
                cx.strokeStyle = LegColor;
                cx.lineWidth = limbWidth;
                cx.translate(0.5 * w, 0.7 * h);
                cx.rotate(leg2Angle);
                cx.beginPath();
                cx.moveTo(0, 0);
                cx.quadraticCurveTo(
                    -legLength / 8,
                    legLength / 2,
                    0,
                    legLength,
                );
                cx.stroke();
                cx.restore();

                // Head
                cx.beginPath();
                cx.roundRect(
                    0.3 * w,
                    headHeight / 4,
                    headDepth,
                    headHeight,
                    headRounding,
                );

                // Torso
                cx.roundRect(
                    (w - torsoDepth) / 2,
                    0.3 * h,
                    torsoDepth,
                    torsoLength,
                    torsoRounding,
                );
                cx.fill();

                // Arm (front)
                cx.save();
                cx.strokeStyle = ArmColor;
                cx.lineWidth = armWidth;
                cx.translate(0.5 * w, 0.4 * h);
                cx.rotate(arm2Angle);
                cx.beginPath();
                cx.moveTo(0, 0);
                cx.quadraticCurveTo(
                    -armLength / 4,
                    armLength / 2,
                    0,
                    armLength,
                );
                cx.stroke();
                cx.restore();
            }
            break;
        case CharacterFacingDirection.Forward:
        case CharacterFacingDirection.Backward: {
            // Leg (left)
            cx.save();
            cx.strokeStyle = LegColor;
            cx.lineWidth = limbWidth;
            cx.translate(0.35 * w, 0.7 * h);
            cx.scale(1, Math.cos(leg1Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(-legLength / 8, legLength / 2, 0, legLength);
            cx.stroke();
            cx.restore();

            // Leg (right)
            cx.save();
            cx.strokeStyle = LegColor;
            cx.lineWidth = limbWidth;
            cx.translate(0.7 * w, 0.7 * h);
            cx.scale(1, Math.cos(leg2Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(legLength / 8, legLength / 2, 0, legLength);
            cx.stroke();
            cx.restore();

            // Arm (left)
            cx.save();
            cx.rotate((10 * Math.PI) / 180);
            cx.strokeStyle = ArmColor;
            cx.lineWidth = armWidth;
            cx.translate(0.4 * w, 0.35 * h);
            cx.scale(1, Math.cos(arm1Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(-armLength / 4, armLength / 2, 0, armLength);
            cx.stroke();
            cx.restore();

            // Arm (right)
            cx.save();
            cx.rotate((-10 * Math.PI) / 180);
            cx.strokeStyle = ArmColor;
            cx.lineWidth = armWidth;
            cx.translate(0.6 * w, 0.4 * h);
            cx.scale(1, Math.cos(arm2Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(armLength / 4, armLength / 2, 0, armLength);
            cx.stroke();
            cx.restore();

            // Torso
            cx.beginPath();
            cx.roundRect(
                0.2 * w,
                0.3 * h,
                torsoWidth,
                torsoLength,
                torsoRounding,
            );

            // Head
            cx.roundRect(
                (w - headWidth) / 2,
                headHeight / 4,
                headWidth,
                headHeight,
                headRounding,
            );
            cx.fill();

            break;
        }
        case CharacterFacingDirection.ForwardRight: {
            // Leg (left)
            cx.save();
            cx.strokeStyle = LegColorDarker;
            cx.lineWidth = limbWidth;
            cx.translate(0.35 * w, 0.7 * h);
            cx.rotate(leg2Angle / 4);
            cx.scale(1, Math.cos(leg1Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(-legLength / 8, legLength / 2, 0, legLength);
            cx.stroke();
            cx.restore();

            // Leg (right)
            cx.save();
            cx.strokeStyle = LegColor;
            cx.lineWidth = limbWidth;
            cx.translate(0.65 * w, 0.7 * h);
            cx.rotate(leg2Angle / 4);
            cx.scale(1, Math.cos(leg2Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(legLength / 8, legLength / 2, 0, legLength);
            cx.stroke();
            cx.restore();

            // Arm (left)
            cx.save();
            cx.strokeStyle = ArmColor;
            cx.lineWidth = armWidth;
            cx.translate(0.2 * w, 0.33 * h);
            cx.rotate(arm2Angle / 2);
            cx.scale(1, Math.cos(arm2Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(-armLength / 4, armLength / 2, 0, armLength);
            cx.stroke();
            cx.restore();

            // Arm (right)
            cx.save();
            cx.strokeStyle = ArmColor;
            cx.lineWidth = armWidth;
            cx.translate(0.8 * w, 0.33 * h);
            cx.rotate(arm2Angle / 2);
            cx.scale(1, Math.cos(arm2Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(armLength / 4, armLength / 2, 0, armLength);
            cx.stroke();
            cx.restore();

            // Head
            cx.beginPath();
            cx.roundRect(
                (w - headWidth) / 2,
                headHeight / 4,
                headWidth,
                headHeight,
                headRounding,
            );

            // Torso
            cx.roundRect(
                (w - torsoWidth) / 2,
                0.3 * h,
                torsoWidth,
                torsoLength,
                torsoRounding,
            );
            cx.fill();

            break;
        }
        case CharacterFacingDirection.BackwardRight: {
            // Leg (right)
            cx.save();
            cx.strokeStyle = LegColor;
            cx.lineWidth = limbWidth;
            cx.translate(0.65 * w, 0.7 * h);
            cx.rotate(leg2Angle / 4);
            cx.scale(1, Math.cos(leg2Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(legLength / 8, legLength / 2, 0, legLength);
            cx.stroke();
            cx.restore();

            // Leg (left)
            cx.save();
            cx.strokeStyle = LegColorDarker;
            cx.lineWidth = limbWidth;
            cx.translate(0.35 * w, 0.7 * h);
            cx.rotate(leg2Angle / 4);
            cx.scale(1, Math.cos(leg1Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(-legLength / 8, legLength / 2, 0, legLength);
            cx.stroke();
            cx.restore();

            // Arm (right)
            cx.save();
            cx.strokeStyle = ArmColor;
            cx.lineWidth = armWidth;
            cx.translate(0.8 * w, 0.35 * h);
            cx.rotate(arm2Angle / 2);
            cx.scale(1, Math.cos(arm2Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(armLength / 4, armLength / 2, 0, armLength);
            cx.stroke();
            cx.restore();

            // Arm (left)
            cx.save();
            cx.strokeStyle = ArmColor;
            cx.lineWidth = armWidth;
            cx.translate(0.2 * w, 0.35 * h);
            cx.rotate(arm2Angle / 2);
            cx.scale(1, Math.cos(arm2Angle + Math.PI / 8));
            cx.beginPath();
            cx.moveTo(0, 0);
            cx.quadraticCurveTo(-armLength / 4, armLength / 2, 0, armLength);
            cx.stroke();
            cx.restore();

            // Head
            cx.beginPath();
            cx.roundRect(
                (w - headWidth) / 2,
                headHeight / 4,
                headWidth,
                headHeight,
                headRounding,
            );

            // Torso
            cx.roundRect(
                (w - torsoWidth) / 2,
                0.3 * h,
                torsoWidth,
                torsoLength,
                torsoRounding,
            );
            cx.fill();

            break;
        }
        default:
            break;
    }

    // Face with eyes and nose
    if (
        direction === CharacterFacingDirection.Backward ||
        direction === CharacterFacingDirection.BackwardRight
    ) {
        cx.save();

        cx.shadowColor = "rgba(0, 0, 0, 0.5)";
        cx.shadowBlur = 0;

        // Face
        cx.fillStyle = faceColor;
        const faceWidth = headWidth - faceMargin;
        const faceHeight = headHeight - faceMargin * 1.75;
        cx.shadowOffsetY = -faceHeight / 10;
        const faceX = (w - faceWidth) / 2;
        const faceY = headHeight - faceHeight;

        cx.beginPath();
        cx.roundRect(faceX, faceY, faceWidth, faceHeight, faceRounding);
        cx.fill();
        cx.closePath();

        cx.shadowOffsetY = 0;

        // Eyes
        const eyeRadius = 0.05 * headWidth;
        const eyeXOffset = faceWidth / 4;
        const eyeYOffset = faceHeight / 3;
        const leftEyeX = faceX + eyeXOffset;
        const rightEyeX = faceX + faceWidth - eyeXOffset;
        const eyeY = faceY + eyeYOffset;

        cx.fillStyle = eyeColor;
        cx.beginPath();
        cx.arc(leftEyeX, eyeY, eyeRadius, 0, Math.PI * 2);
        cx.arc(rightEyeX, eyeY, eyeRadius, 0, Math.PI * 2);
        cx.fill();
        cx.closePath();

        // Pupils
        const pupilRadius = 0.02 * headWidth;
        const pupilXOffset = 0.01 * headWidth;
        const pupilYOffset = 0.01 * headHeight;

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
        const noseWidth = 0.1 * headWidth;
        const noseHeight = 0.15 * headHeight;
        const noseX = faceX + (faceWidth - noseWidth) / 1.75;
        const noseY = faceY + (faceHeight - noseHeight) / 1.5;

        cx.fillStyle = noseColor;
        cx.beginPath();
        cx.moveTo(noseX, noseY);
        cx.lineTo(noseX + noseWidth / 2, noseY + noseHeight);
        cx.lineTo(noseX - noseWidth / 2, noseY + noseHeight);
        cx.closePath();
        cx.fill();

        cx.restore();
    }

    cx.restore();
}
