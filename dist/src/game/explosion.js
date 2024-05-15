"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Explosion = void 0;
const planck_1 = require("planck");
const math_1 = require("../utils/math");
const data_1 = require("../utils/data");
const bullet_1 = require("./bullet");
const decal_1 = require("./objects/decal");
class Explosion {
    position;
    typeString;
    typeId;
    layer;
    source;
    objectUsed;
    constructor(position, typeSting, layer, source, objectUsed) {
        this.position = position;
        this.typeId = data_1.TypeToId[typeSting];
        this.typeString = typeSting;
        this.layer = layer;
        this.source = source;
        this.objectUsed = objectUsed;
    }
    explode(game) {
        if (this.position.x < 0 || this.position.x > game.map.width || this.position.y < 0 || this.position.y > game.map.height)
            return;
        const explosionData = data_1.Explosions[this.typeString];
        const radius = explosionData.rad.max;
        // TODO: check if the object / player is behind a wall, and better algorithm to calculate the damage
        const visibleObjects = game.visibleObjects[28][Math.round(this.position.x / 10) * 10][Math.round(this.position.y / 10) * 10];
        //                  what is index 28??? <--||
        for (const object of visibleObjects) {
            if (object.damageable && !object.dead && (0, math_1.sameLayer)(this.layer, object.layer)) {
                const record = (0, math_1.objectCollision)(object, this.position, radius);
                if (record.collided) {
                    let damage = explosionData.damage * explosionData.obstacleDamage;
                    const distance = (0, math_1.distanceBetween)(object.position, this.position);
                    if (distance > explosionData.rad.min) {
                        const damagePercent = Math.abs(distance / explosionData.rad.max - 1);
                        damage *= damagePercent;
                    }
                    object.damage(damage, this.source);
                }
            }
        }
        for (const player of game.livingPlayers) {
            if ((0, math_1.sameLayer)(this.layer, player.layer)) {
                const record = (0, math_1.objectCollision)(player, this.position, radius);
                if (record.collided) {
                    let damage = explosionData.damage;
                    const distance = (0, math_1.distanceBetween)(player.position, this.position);
                    if (distance > explosionData.rad.min) {
                        const damagePercent = Math.abs(distance / explosionData.rad.max - 1);
                        damage *= damagePercent;
                    }
                    player.damage(damage, this.source, this.objectUsed);
                }
            }
        }
        for (const loot of game.loot) {
            if ((0, math_1.sameLayer)(loot.layer, this.layer)) {
                if ((0, math_1.objectCollision)(loot, this.position, explosionData.rad.max).collided) {
                    const angle = (0, math_1.angleBetween)(loot.position, this.position);
                    const distance = (0, math_1.distanceBetween)(loot.position, this.position);
                    // it works, please don't ask questions
                    const velocity = loot.body.getLinearVelocity()
                        .add((0, planck_1.Vec2)(Math.cos(angle), Math.sin(angle))
                        .mul(explosionData.rad.max - distance).mul(0.006));
                    loot.body.setLinearVelocity(velocity);
                }
            }
        }
        for (let i = 0; i < explosionData.shrapnelCount; i++) {
            const angle = (0, math_1.randomFloat)(0, Math.PI * 2);
            const direction = (0, planck_1.Vec2)(Math.cos(angle), Math.sin(angle));
            // You could use the random-point-in-circle function for this
            const bullet = new bullet_1.Bullet(this.source, this.position, direction, explosionData.shrapnelType, 
            //! unsafe
            this.objectUsed, false, this.layer, game);
            game.bullets.add(bullet);
            game.newBullets.add(bullet);
        }
        if (explosionData.decalType) {
            const decal = new decal_1.Decal(explosionData.decalType, game, this.position, this.layer);
            game.dynamicObjects.add(decal);
            game.fullDirtyObjects.add(decal);
            game.updateObjects = true;
        }
    }
}
exports.Explosion = Explosion;
//# sourceMappingURL=explosion.js.map