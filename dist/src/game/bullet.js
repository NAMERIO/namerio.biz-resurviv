"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bullet = void 0;
const planck_1 = require("planck");
const data_1 = require("../utils/data");
const math_1 = require("../utils/math");
// this class should probably extend GameObject
class Bullet {
    isPlayer = false;
    isObstacle = false;
    isBullet = true;
    isLoot = false;
    collidesWith = {
        player: true,
        obstacle: true,
        bullet: false,
        loot: false
    };
    body;
    shooter;
    initialPosition;
    direction;
    typeString;
    typeId;
    layer;
    varianceT = 0;
    distAdjIdx = 0;
    clipDistance = false;
    shotFx;
    shotSource;
    shotOffhand = false;
    lastShot = false;
    reflect = false;
    reflectCount = 0;
    reflectObjId;
    splinter = false;
    splinterSmall = false;
    trailFx = false;
    trailSaturated = false;
    trailThick = false;
    maxDistance;
    dead = false;
    constructor(shooter, position, direction, typeString, shotSource, shotFx, layer, game) {
        const bulletData = data_1.Bullets[typeString];
        this.shooter = shooter;
        this.initialPosition = position;
        this.direction = direction;
        this.typeString = typeString;
        this.typeId = data_1.TypeToId[typeString];
        this.shotSource = shotSource;
        this.shotFx = shotFx;
        // explosion shrapnel variance
        this.varianceT = (0, math_1.randomFloat)(0, bulletData.variance);
        this.maxDistance = bulletData.distance * (this.varianceT + 1);
        this.layer = layer;
        this.body = game.world.createBody({
            type: "dynamic",
            position,
            fixedRotation: true,
            bullet: true
        });
        this.body.createFixture({
            shape: (0, planck_1.Circle)(0),
            friction: 0.0,
            density: 0.0,
            restitution: 0.0,
            userData: this
        });
        this.body.setMassData({
            I: 0,
            center: (0, planck_1.Vec2)(0, 0),
            mass: 0.0
        });
        this.body.setLinearVelocity(direction.clone().mul((bulletData.speed / 1000) * (this.varianceT + 1)));
    }
    get position() {
        return this.initialPosition;
    }
    get distance() {
        return (0, math_1.distanceBetween)(this.initialPosition, this.body.getPosition());
    }
}
exports.Bullet = Bullet;
//# sourceMappingURL=bullet.js.map