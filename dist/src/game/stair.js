"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stair = void 0;
const math_1 = require("../utils/math");
const constants_1 = require("../utils/constants");
const planck_1 = require("planck");
class Stair {
    orientation;
    collision;
    downDir;
    downCollider;
    upCollider;
    constructor(position, orientation, data) {
        this.orientation = orientation;
        this.collision = (0, math_1.rotateRect)(position, (0, planck_1.Vec2)(data.collision.min), (0, planck_1.Vec2)(data.collision.max), 1, this.orientation);
        this.downDir = (0, math_1.vec2Rotate)(data.downDir, (0, math_1.orientationToRad)(this.orientation));
        [this.downCollider, this.upCollider] = (0, math_1.splitRect)(this.collision, this.downDir);
    }
    check(object) {
        const collides = (0, math_1.distanceToRect)(this.collision.min, this.collision.max, object.position, constants_1.Constants.player.radius).collided;
        if (collides) {
            const collidesUp = (0, math_1.distanceToRect)(this.upCollider.min, this.upCollider.max, object.position, constants_1.Constants.player.radius).collided;
            const collidesDown = (0, math_1.distanceToRect)(this.downCollider.min, this.downCollider.max, object.position, constants_1.Constants.player.radius).collided;
            if (collidesUp && !collidesDown) {
                object.layer = 2;
            }
            if (!collidesUp && collidesDown) {
                object.layer = 3;
            }
        }
        return collides;
    }
}
exports.Stair = Stair;
//# sourceMappingURL=stair.js.map