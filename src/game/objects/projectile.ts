import { Constants, ObjectKind } from "../../utils/constants";
import { Weapons } from "../../utils/data";
import type { SurvivBitStream } from "../../utils/survivBitStream";
import { GameObject } from "../gameObject";
import { Vec2, type Body, Circle } from "planck";
import { type Game } from "../game";
import { Explosion } from "../explosion";
import { type Player } from "./player";
import { clamp, directionToOrientation, lerpRangeRemap } from "../../utils/math";
import { Loot } from "./loot";

export class Projectile extends GameObject {
    kind = ObjectKind.Projectile;

    zPos = 2;
    direction: Vec2;

    data: any;

    body: Body;

    isPlayer = false;
    isObstacle = false;
    isBullet = false;
    isLoot = false;
    isProjectile = true;

    player: Player;

    collidesWith = {
        player: false,
        obstacle: true,
        bullet: true,
        loot: false,
        projectile: false
    };

    constructor(
        typeString: string,
        game: Game,
        position: Vec2,
        layer: number,
        direction: Vec2,
        player: Player,
        customVelocity: number = 1 //this is the number of ticks since grenade cook has started
    ) {
        super(game, typeString, position, layer);

        this.direction = direction;

        this.player = player;

        this.data = Weapons[this.typeString];

        const orientation = directionToOrientation(direction);

        let trueDistanceToMouse: number;
        //if player is pointing up or down, only has half of distance to work with so needs to scale accordingly
        if (orientation == 1 || orientation == 3){
            trueDistanceToMouse = (player.distanceToMouse/player.zoom)*80;
        }else{
            trueDistanceToMouse = (player.distanceToMouse/player.zoom)*40;
        }

        // const trueDistanceToMouse = (player.distanceToMouse/player.zoom)*40;
        const r = Math.pow(customVelocity, Math.pow(trueDistanceToMouse/30, 2));
        const linearVelocity = lerpRangeRemap(r, 1, 120, 12, 40)+(player.speed*1000)/2;
        const linearDamping = lerpRangeRemap(linearVelocity, 12, 40, 0.0004, 0.0011);

        // console.log({"linearVelocity": linearVelocity, "linearDamping": linearDamping});

        this.body = this.game.world.createBody({
            type: "dynamic",
            position,
            fixedRotation: true,
            linearDamping: linearDamping,
            // linearVelocity: this.direction.clone().mul((10)/1000)
            // linearVelocity: this.direction.clone().mul((100)/1000)
            linearVelocity: this.direction.clone().mul((linearVelocity)/1000)
        });
        //this.data.throwPhysics.speed
        this.body.createFixture({
            shape: Circle(0.5),
            restitution: 0.5,
            density: 0.0,
            friction: 0.0,
            userData: this
        });

        setTimeout(() => {
            this.explode();
            // this.player.body.setPosition(this.position.clone());
            // this.player.layer = this.layer;
            // for (let i = 0; i < 10; i++){
            //     new Loot(this.game, "flare", this.position, this.layer, 1);
            // }
            // this.player.fullDirtyObjects.add(this.player);
            // this.game.projectiles.delete(this);
            // this.game.dynamicObjects.delete(this);
            // this.game.deletedObjects.add(this);
            // this.game.world.destroyBody(this.body);
        }, (this.data.fuseTime - customVelocity/30) * 1000);
        // }, this.data.fuseTime * 1000);
    }

    update(): void {

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
            if (this.layer === 2) this.layer = 0;
            if (this.layer === 3) this.layer = 1;
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

    explode(): void {
        this.game.explosions.add(new Explosion(this.position, this.data.explosionType, this.layer, this.player, this));
        this.game.projectiles.delete(this);
        this.game.dynamicObjects.delete(this);
        this.game.deletedObjects.add(this);
        this.game.world.destroyBody(this.body);
    }

    serializePartial(stream: SurvivBitStream): void {
        stream.writeVec(this.position, 0, 0, 1024, 1024, 16);
        stream.writeFloat(this.zPos, 0, Constants.projectile.maxHeight, 10);
        stream.writeUnitVec(this.direction, 7);
    }

    serializeFull(stream: SurvivBitStream): void {
        stream.writeGameType(this.typeId);
        stream.writeBits(this.layer, 2);
        stream.writeBits(0, 4); // padding
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    damage(amount: number, source): void {}
}
