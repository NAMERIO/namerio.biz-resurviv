"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToMilliseconds = exports.lerpRangeRemap = exports.lerp = exports.vecLerp = exports.randomPointInsideCircle = exports.radiansToDegrees = exports.degreesToRadians = exports.vec2Rotate = exports.unitVecToRadians = exports.bodyFromCollisionData = exports.angleBetween = exports.splitRect = exports.getOppositeOrientation = exports.directionToOrientation = exports.orientationToRad = exports.rotateRect = exports.addAdjust = exports.addOrientations = exports.objectCollision = exports.distanceToRect = exports.distanceToCircle = exports.rectRectCollision = exports.clamp = exports.rectCollision = exports.circleCollision = exports.distanceBetween = exports.randomBoolean = exports.weightedRandom = exports.randomVec = exports.random = exports.randomFloatSpecial = exports.randomFloat = exports.toStairsLayer = exports.toGroundLayer = exports.sameLayer = void 0;
const planck_1 = require("planck");
const constants_1 = require("./constants");
const obstacle_1 = require("../game/objects/obstacle");
const player_1 = require("../game/objects/player");
const loot_1 = require("../game/objects/loot");
/*
Game objects can belong to the following layers:
   0: ground layer
   1: bunker layer
   2: ground and stairs (both)
   3: bunker and stairs (both)

Objects on the same layer should interact with one another.
*/
function sameLayer(a, b) {
    return !!((1 & a) === (1 & b) || (2 & a && 2 & b));
}
exports.sameLayer = sameLayer;
function toGroundLayer(a) {
    return 1 & a;
}
exports.toGroundLayer = toGroundLayer;
function toStairsLayer(a) {
    return 2 | a;
}
exports.toStairsLayer = toStairsLayer;
/**
 * Generate a random floating-point value.
 * @param min The minimum value that can be generated.
 * @param max The maximum value that can be generated.
 */
function randomFloat(min, max) {
    return (Math.random() * (max - min) + min);
}
exports.randomFloat = randomFloat;
function randomFloatSpecial(min, max) {
    return (Math.random() < 0.5) ? randomFloat(min, max) : -randomFloat(min, max);
}
exports.randomFloatSpecial = randomFloatSpecial;
/**
 * Generate a random integer.
 * @param min The minimum value that can be generated.
 * @param max The maximum value that can be generated.
 */
function random(min, max) {
    return Math.floor(randomFloat(min, max + 1));
}
exports.random = random;
/**
 * Generate a vector of random direction and magnitude.
 * @param minX The minimum length in the x-direction.
 * @param maxX The maximum length in the x-direction.
 * @param minY The minimum length in the y-direction.
 * @param maxY The maximum length in the y-direction.
 */
function randomVec(minX, maxX, minY, maxY) {
    return (0, planck_1.Vec2)(random(minX, maxX), random(minY, maxY));
}
exports.randomVec = randomVec;
// https://stackoverflow.com/a/55671924/5905216
/**
 * Pick a random element from a weighted series of elements.
 * @param items The elements to choose from.
 * @param weights A legend of the elements' relative weight.
 */
function weightedRandom(items, weights) {
    let i;
    for (i = 1; i < weights.length; i++)
        weights[i] += weights[i - 1];
    const random = Math.random() * weights[weights.length - 1];
    for (i = 0; i < weights.length; i++) {
        if (weights[i] > random)
            break;
    }
    return items[i];
}
exports.weightedRandom = weightedRandom;
/**
 * Generate a random boolean value.
 */
function randomBoolean() {
    return Math.random() < 0.5;
}
exports.randomBoolean = randomBoolean;
/**
 * Calculate the distance between two points.
 * @param v1 The first point.
 * @param v2 The second point.
 */
function distanceBetween(v1, v2) {
    return Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2));
}
exports.distanceBetween = distanceBetween;
/**
 * Check whether two circles collide.
 * @param pos1 The center of the first circle.
 * @param r1 The radius of the first circle.
 * @param pos2 The center of the second circle.
 * @param r2 Thge radius of the second circle.
 */
function circleCollision(pos1, r1, pos2, r2) {
    const a = r1 + r2;
    const x = pos1.x - pos2.x;
    const y = pos1.y - pos2.y;
    return a * a > x * x + y * y;
}
exports.circleCollision = circleCollision;
/* export function rectCollision(min: Vec2, max: Vec2, circlePos: Vec2, circleRad: number): boolean {
    const distX = Math.max(min.x, Math.min(max.x, circlePos.x)) - circlePos.x;
    const distY = Math.max(min.y, Math.min(max.y, circlePos.y)) - circlePos.y;
    return distX * distX + distY * distY > circleRad * circleRad;
} */
function rectCollision(min, max, pos, rad) {
    const cpt = (0, planck_1.Vec2)(clamp(pos.x, min.x, max.x), clamp(pos.y, min.y, max.y));
    const dstSqr = planck_1.Vec2.lengthSquared(planck_1.Vec2.sub(pos, cpt));
    return (dstSqr < rad * rad) || (pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y);
}
exports.rectCollision = rectCollision;
/**
 * Conform a number to specified bounds.
 * @param a The number to conform.
 * @param min The minimum value the number can hold.
 * @param max The maximum value the number can hold.
 */
function clamp(a, min, max) {
    return a < max ? a > min ? a : min : max;
}
exports.clamp = clamp;
function rectRectCollision(min1, max1, min2, max2) {
    return min2.x < max1.x && min2.y < max1.y && min1.x < max2.x && min1.y < max2.y;
}
exports.rectRectCollision = rectRectCollision;
/**
 * Determine the distance between two circles.
 * @param pos1 The center of the first circle.
 * @param r1 The radius of the first circle.
 * @param pos2 The center of the second circle.
 * @param r2 The radius of the second circle.
 * @returns An object representation of whether the circles collide and the distance between their closest vertices.
 */
function distanceToCircle(pos1, r1, pos2, r2) {
    const a = r1 + r2;
    const x = pos1.x - pos2.x;
    const y = pos1.y - pos2.y;
    const a2 = a * a;
    const xy = (x * x + y * y);
    return { collided: a2 > xy, distance: a2 - xy };
}
exports.distanceToCircle = distanceToCircle;
function distanceToRect(min, max, circlePos, circleRad) {
    const distX = Math.max(min.x, Math.min(max.x, circlePos.x)) - circlePos.x;
    const distY = Math.max(min.y, Math.min(max.y, circlePos.y)) - circlePos.y;
    const radSquared = circleRad * circleRad;
    const distSquared = (distX * distX + distY * distY);
    return { collided: distSquared < radSquared, distance: radSquared - distSquared };
}
exports.distanceToRect = distanceToRect;
function objectCollision(object, position, radius) {
    let record;
    if (object instanceof obstacle_1.Obstacle) {
        if (object.collision.type === constants_1.CollisionType.Circle) {
            record = distanceToCircle(object.position, object.collision.rad, position, radius);
        }
        else if (object.collision.type === constants_1.CollisionType.Rectangle) {
            record = distanceToRect(object.collision.min, object.collision.max, position, radius);
        }
    }
    else if (object instanceof player_1.Player) {
        record = distanceToCircle(object.position, object.scale, position, radius);
    }
    else if (object instanceof loot_1.Loot) {
        record = distanceToCircle(object.position, 0, position, radius);
    }
    // bug this if-else chain isn't necessarily exhaustive
    return record;
}
exports.objectCollision = objectCollision;
function addOrientations(n1, n2) {
    return (n1 + n2) % 4;
}
exports.addOrientations = addOrientations;
function addAdjust(position1, position2, orientation) {
    if (orientation === 0)
        return planck_1.Vec2.add(position1, position2);
    let xOffset, yOffset;
    switch (orientation) {
        case 1:
            xOffset = -position2.y;
            // noinspection JSSuspiciousNameCombination
            yOffset = position2.x;
            break;
        case 2:
            xOffset = -position2.x;
            yOffset = -position2.y;
            break;
        case 3:
            // noinspection JSSuspiciousNameCombination
            xOffset = position2.y;
            yOffset = -position2.x;
            break;
    }
    return planck_1.Vec2.add(position1, (0, planck_1.Vec2)(xOffset, yOffset));
}
exports.addAdjust = addAdjust;
function rotateRect(pos, min, max, scale, orientation) {
    min = planck_1.Vec2.mul(min, scale);
    max = planck_1.Vec2.mul(max, scale);
    if (orientation !== 0) {
        const minX = min.x;
        const minY = min.y;
        const maxX = max.x;
        const maxY = max.y;
        switch (orientation) {
            case 1:
                min = (0, planck_1.Vec2)(minX, maxY);
                max = (0, planck_1.Vec2)(maxX, minY);
                break;
            case 2:
                min = (0, planck_1.Vec2)(maxX, maxY);
                max = (0, planck_1.Vec2)(minX, minY);
                break;
            case 3:
                min = (0, planck_1.Vec2)(maxX, minY);
                max = (0, planck_1.Vec2)(minX, maxY);
                break;
        }
    }
    return {
        min: addAdjust(pos, min, orientation),
        max: addAdjust(pos, max, orientation)
    };
}
exports.rotateRect = rotateRect;
function orientationToRad(orientation) {
    return (orientation % 4) * 0.5 * Math.PI;
}
exports.orientationToRad = orientationToRad;
function directionToOrientation(direction) {
    const [x, y] = [direction.x, direction.y];
    if (Math.abs(x) > Math.abs(y)) {
        return x > 0 ? 0 : 2;
    }
    else {
        return y > 0 ? 1 : 3;
    }
}
exports.directionToOrientation = directionToOrientation;
function getOppositeOrientation(orientation) {
    if (orientation == 0) {
        return 2;
    }
    else if (orientation == 1) {
        return 3;
    }
    else if (orientation == 2) {
        return 0;
    }
    else {
        return 1;
    }
}
exports.getOppositeOrientation = getOppositeOrientation;
function splitRect(rect, axis) {
    const e = planck_1.Vec2.mul(planck_1.Vec2.sub(rect.max, rect.min), 0.5);
    const c = planck_1.Vec2.add(rect.min, e);
    const left = {
        min: (0, planck_1.Vec2)(rect.min).clone(),
        max: (0, planck_1.Vec2)(rect.max).clone()
    };
    const right = {
        min: (0, planck_1.Vec2)(rect.min).clone(),
        max: (0, planck_1.Vec2)(rect.max).clone()
    };
    if (Math.abs(axis.y) > Math.abs(axis.x)) {
        left.max = (0, planck_1.Vec2)(rect.max.x, c.y);
        right.min = (0, planck_1.Vec2)(rect.min.x, c.y);
    }
    else {
        left.max = (0, planck_1.Vec2)(c.x, rect.max.y);
        right.min = (0, planck_1.Vec2)(c.x, rect.min.y);
    }
    const dir = planck_1.Vec2.sub(rect.max, rect.min);
    return planck_1.Vec2.dot(dir, axis) > 0.0
        ? [right, left]
        : [left, right];
}
exports.splitRect = splitRect;
/**
 * Calculate the angle between two vectors.
 * @param a The first vector.
 * @param b The second vector.
 * @returns The angle, in radians, between the two vectors.
 */
function angleBetween(a, b) {
    const dy = a.y - b.y;
    const dx = a.x - b.x;
    return Math.atan2(dy, dx);
}
exports.angleBetween = angleBetween;
function bodyFromCollisionData(world, data, position, orientation = 0, scale = 1, obstacle) {
    let body;
    switch (data.type) {
        case constants_1.CollisionType.Circle:
            body = world.createBody({
                type: "static",
                position: addAdjust(position, data.pos, orientation),
                fixedRotation: true
            });
            body.createFixture({
                shape: (0, planck_1.Circle)(data.rad * scale),
                userData: obstacle
            });
            break;
        case constants_1.CollisionType.Rectangle: {
            const rect = rotateRect(position, data.min, data.max, scale, orientation);
            const width = (rect.max.x - rect.min.x) / 2;
            const height = (rect.max.y - rect.min.y) / 2;
            if (width === 0 || height === 0)
                return null;
            obstacle.collision.halfWidth = width;
            obstacle.collision.halfHeight = height;
            body = world.createBody({
                type: "static",
                position,
                fixedRotation: true
            });
            body.createFixture({
                shape: (0, planck_1.Box)(width, height),
                userData: obstacle
            });
        }
    }
    return body;
}
exports.bodyFromCollisionData = bodyFromCollisionData;
/**
 * Get the angle, in radians, formed by a vector.
 * @param v The vector to calculate against.
 */
function unitVecToRadians(v) {
    return Math.atan2(v.y, v.x);
}
exports.unitVecToRadians = unitVecToRadians;
function vec2Rotate(v, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return (0, planck_1.Vec2)(v.x * cos - v.y * sin, v.x * sin + v.y * cos);
}
exports.vec2Rotate = vec2Rotate;
/**
 * Convert degrees to radians.
 * @param degrees The angle, in degrees.
 */
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}
exports.degreesToRadians = degreesToRadians;
/**
 * Convert radians to degrees.
 * @param radians The angle, in radians.
 */
function radiansToDegrees(radians) {
    return (radians * 180) / Math.PI;
}
exports.radiansToDegrees = radiansToDegrees;
/**
 * Generate a random point inside of a circle.
 * @link https://stackoverflow.com/a/51727716/5905216
 * @param position The center of the circle.
 * @param radius The radius of the circle.
 * A vector representation of the randomized point.
 */
function randomPointInsideCircle(position, radius) {
    /*
        Easier method:

        Use the Pythagorean theorem:
        x*x + y*y = 1

        Isolate y
        y = ±√(1 - x*x)

        So for some x, the expression above yields y coordinates
        which lie on the unit circle
        Thus,

        const randomSign = () => Math.random() > 0.5 ? -1 : 1;
        const x = randomSign() * Math.random();

        return Vec2(x * radius, randomSign() * Math.sqrt(1 - x*x)).add(position);
    */
    let x, y;
    do {
        x = 2 * Math.random() - 1.0; // range [-1, +1)
        y = 2 * Math.random() - 1.0;
    } while ((x * x + y * y) >= 1); // check unit circle
    // scale and translate the points
    return (0, planck_1.Vec2)(x * radius + position.x, y * radius + position.y);
}
exports.randomPointInsideCircle = randomPointInsideCircle;
function vecLerp(t, a, b) {
    return planck_1.Vec2.add(planck_1.Vec2.mul(a, 1.0 - t), planck_1.Vec2.mul(b, t));
}
exports.vecLerp = vecLerp;
function lerp(t, a, b) {
    return a * (1.0 - t) + b * t;
}
exports.lerp = lerp;
/**
   * Linear interpolation with extra steps, interpolates from one range to another
   * lerpRangeRemap(50, 0, 100, 0, 360) will output 180 since 50 is halfway between 0 and 100 so the function finds the halfway point between 0 and 360
   *
   * @param {number} t        Input
   * @param {number} tMin     Input min
   * @param {number} tMax     Input max
   * @param {number} valueMin Output min
   * @param {number} valueMax Output max
   * @returns {number}        Interpolated number
   */
function lerpRangeRemap(t, tMin, tMax, valueMin, valueMax) {
    const clampedT = clamp(t, tMin, tMax);
    return ((clampedT - tMin) * (valueMax - valueMin)) / (tMax - tMin) + valueMin;
}
exports.lerpRangeRemap = lerpRangeRemap;
function convertToMilliseconds(minutes, seconds) {
    const minutesInMilliseconds = minutes * 60 * 1000; // 1 minute = 60 seconds * 1000 milliseconds
    const secondsInMilliseconds = seconds * 1000; // 1 second = 1000 milliseconds
    // Total milliseconds
    const totalMilliseconds = minutesInMilliseconds + secondsInMilliseconds;
    return totalMilliseconds;
}
exports.convertToMilliseconds = convertToMilliseconds;
//# sourceMappingURL=math.js.map