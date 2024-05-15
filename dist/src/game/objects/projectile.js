"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Projectile = void 0;
const constants_1 = require("../../utils/constants");
const data_1 = require("../../utils/data");
const gameObject_1 = require("../gameObject");
const planck_1 = require("planck");
const explosion_1 = require("../explosion");
const math_1 = require("../../utils/math");
class Projectile extends gameObject_1.GameObject {
    kind = constants_1.ObjectKind.Projectile;
    zPos = 2;
    direction;
    data;
    body;
    isPlayer = false;
    isObstacle = false;
    isBullet = false;
    isLoot = false;
    isProjectile = true;
    player;
    collidesWith = {
        player: false,
        obstacle: true,
        bullet: false,
        loot: false,
        projectile: false
    };
    constructor(typeString, game, position, layer, direction, player, customVelocity = 1 //this is the number of ticks since grenade cook has started
    ) {
        super(game, typeString, position, layer);
        this.direction = direction;
        this.player = player;
        this.data = data_1.Weapons[this.typeString];
        const orientation = (0, math_1.directionToOrientation)(direction);
        let trueDistanceToMouse;
        //if player is pointing up or down, only has half of distance to work with so needs to scale accordingly
        if (orientation == 1 || orientation == 3) {
            trueDistanceToMouse = (player.distanceToMouse / player.zoom) * 80;
        }
        else {
            trueDistanceToMouse = (player.distanceToMouse / player.zoom) * 40;
        }
        // const trueDistanceToMouse = (player.distanceToMouse/player.zoom)*40;
        const r = Math.pow(customVelocity, Math.pow(trueDistanceToMouse / 30, 2));
        const linearVelocity = (0, math_1.lerpRangeRemap)(r, 1, 120, 12, 40) + (player.speed * 1000) / 2;
        const linearDamping = (0, math_1.lerpRangeRemap)(linearVelocity, 12, 40, 0.0004, 0.0011);
        // console.log({"linearVelocity": linearVelocity, "linearDamping": linearDamping});
        this.body = this.game.world.createBody({
            type: "dynamic",
            position,
            fixedRotation: true,
            linearDamping: linearDamping,
            // linearVelocity: this.direction.clone().mul((10)/1000)
            // linearVelocity: this.direction.clone().mul((100)/1000)
            linearVelocity: this.direction.clone().mul((linearVelocity) / 1000)
        });
        //this.data.throwPhysics.speed
        this.body.createFixture({
            shape: (0, planck_1.Circle)(0.5),
            restitution: 0.5,
            density: 0.0,
            friction: 0.0,
            userData: this
        });
        setTimeout(() => {
            this.explode();
        }, (this.data.fuseTime - customVelocity / 30) * 1000);
        // }, this.data.fuseTime * 1000);
    }
    update() {
        // console.log(this.layer);
        let onStair = false;
        const originalLayer = this.layer;
        for (const stair of this.game.stairs) {
            if (stair.check(this)) {
                onStair = true;
                break;
            }
        }
        // console.log(onStair);
        if (!onStair) {
            if (this.layer === 2)
                this.layer = 0;
            if (this.layer === 3)
                this.layer = 1;
        }
        if (this.layer !== originalLayer) {
            // p.fullDirtyObjects.add(p);
            this.game.fullDirtyObjects.add(this);
        }
        if (this.zPos > 0) {
            this.zPos -= 0.05;
            this.game.partialDirtyObjects.add(this);
        }
        if (this.position.x !== this.body.getPosition().x || this.position.y !== this.body.getPosition().y) {
            this._position = this.body.getPosition().clone();
            this.game.partialDirtyObjects.add(this);
        }
    }
    explode() {
        this.game.explosions.add(new explosion_1.Explosion(this.position, this.data.explosionType, this.layer, this.player, this));
        this.game.projectiles.delete(this);
        this.game.dynamicObjects.delete(this);
        this.game.deletedObjects.add(this);
        this.game.world.destroyBody(this.body);
    }
    serializePartial(stream) {
        stream.writeVec(this.position, 0, 0, 1024, 1024, 16);
        stream.writeFloat(this.zPos, 0, constants_1.Constants.projectile.maxHeight, 10);
        stream.writeUnitVec(this.direction, 7);
    }
    serializeFull(stream) {
        stream.writeGameType(this.typeId);
        stream.writeBits(this.layer, 2);
        stream.writeBits(0, 4); // padding
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    damage(amount, source) { }
}
exports.Projectile = Projectile;
//# sourceMappingURL=projectile.js.map