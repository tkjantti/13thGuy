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

import {
    add,
    distance,
    distanceX,
    distanceY,
    dotProduct,
    isZero,
    length,
    multiply,
    normalize,
    subtract,
    Vector,
    ZERO_VECTOR,
} from "./Vector";
import { GameObject } from "./GameObject";

/*
 * The maximum speed that an object can reach. The limit ensures that
 * any inaccuracies in collision detection won't make the objects go
 * too fast.
 */
const MAX_SPEED = 0.5;

export const CHARACTER_MAX_RUN_SPEED = 0.01;
const CHARACTER_RUN_ACCELERATION = 0.0005;

/*
 * How much speed decreases when going over max run speed.
 */
const CHARACTER_SLOWDOWN_ACCELERATION = -0.0001;

const CHARACTER_STOP_ACCELERATION = 0.0005;

const OBSTACLE_BOUNCE_FACTOR = 3;

export function getMovementVelocity(
    c: GameObject,
    direction: Vector,
    dt: number,
): Vector {
    if (isZero(direction)) {
        // Slow down
        const currentSpeed = length(c.velocity);
        const acc = CHARACTER_STOP_ACCELERATION * dt;
        const slowerSpeed = currentSpeed > acc ? currentSpeed - acc : 0;
        const newVelocity =
            slowerSpeed > 0
                ? multiply(normalize(c.velocity), slowerSpeed)
                : ZERO_VECTOR;
        return newVelocity;
    }

    const currentSpeedInDirection = dotProduct(c.velocity, direction);

    const perpendicularDirection: Vector = {
        x: -direction.y,
        y: direction.x,
    };
    const currentSpeedInPerpendicularDirection: number = dotProduct(
        c.velocity,
        perpendicularDirection,
    );

    let accDirectionAmount = CHARACTER_RUN_ACCELERATION * dt;
    if (currentSpeedInDirection > CHARACTER_MAX_RUN_SPEED * dt) {
        accDirectionAmount = CHARACTER_SLOWDOWN_ACCELERATION * dt;
    }

    const accSlowdown = CHARACTER_STOP_ACCELERATION * dt;
    const accPerpendicularTemp =
        Math.abs(currentSpeedInPerpendicularDirection) > accSlowdown
            ? -accSlowdown
            : 0;
    const accPerpendicularAmount =
        Math.sign(currentSpeedInPerpendicularDirection) * accPerpendicularTemp;

    const accDirection: Vector = multiply(direction, accDirectionAmount);
    const accPerpendicular: Vector = multiply(
        perpendicularDirection,
        accPerpendicularAmount,
    );

    const newVelocity = add(c.velocity, add(accDirection, accPerpendicular));
    return newVelocity;
}

export function calculateCollisionToObstacle(
    a: GameObject,
    obstacle: GameObject,
): boolean {
    const radiusX = a.width / 2;
    const radiusY = a.height / 2;
    const radiusObstacleX = obstacle.width / 2;
    const radiusObstacleY = obstacle.height / 3.5;

    const centerA: Vector = {
        x: a.x + a.width / 2,
        y: a.y + a.height / 2,
    };
    const centerANext = add(centerA, a.velocity);
    const centerObstacle: Vector = {
        x: obstacle.x + obstacle.width / 2,
        y: obstacle.y + obstacle.height / 2,
    };

    // TODO: Elliptical distance calculation
    if (
        distanceX(centerANext, centerObstacle) < radiusX + radiusObstacleX &&
        distanceY(centerANext, centerObstacle) < radiusY + radiusObstacleY
    ) {
        const directionToOther = normalize(subtract(centerObstacle, centerA));
        const speedToOther = dotProduct(a.velocity, directionToOther);
        const bouncingVelocity = multiply(
            directionToOther,
            -Math.abs(speedToOther) * OBSTACLE_BOUNCE_FACTOR,
        );

        let aNew = add(a.velocity, bouncingVelocity);
        if (length(aNew) > MAX_SPEED) {
            aNew = multiply(normalize(aNew), MAX_SPEED);
        }

        a.velocity = aNew;
        return true;
    }

    return false;
}

export function calculateCollisionBetweenCharacters(
    a: GameObject,
    b: GameObject,
): boolean {
    const radiusA = a.width * 0.4;
    const radiusB = b.width * 0.4;

    const centerA: Vector = {
        x: a.x + a.width / 2,
        y: a.y + a.height / 2,
    };
    const centerB: Vector = {
        x: b.x + b.width / 2,
        y: b.y + b.height / 2,
    };

    const centerANext = add(centerA, a.velocity);
    const centerBNext = add(centerB, b.velocity);

    if (distance(centerANext, centerBNext) < radiusA + radiusB) {
        const directionAToB = normalize(subtract(centerB, centerA));
        const directionBToA = multiply(directionAToB, -1);

        const speedAToB = dotProduct(a.velocity, directionAToB);
        const speedBToA = dotProduct(b.velocity, directionBToA);

        // Use absolute values for speed in case that the objects
        // are moving away from each other already.
        const velocityAToB = multiply(directionAToB, Math.abs(speedAToB));
        const velocityBToA = multiply(directionBToA, Math.abs(speedBToA));

        let aNew = add(a.velocity, velocityBToA);
        if (length(aNew) > MAX_SPEED) {
            aNew = multiply(normalize(aNew), MAX_SPEED);
        }
        a.velocity = aNew;

        let bNew = add(b.velocity, velocityAToB);
        if (length(bNew) > MAX_SPEED) {
            bNew = multiply(normalize(bNew), MAX_SPEED);
        }
        b.velocity = bNew;

        return true;
    }

    return false;
}
