import crypto from "crypto";
import { Constants, ObjectKind, DamageType, WeaponType, GameMode } from "../utils/constants";
import { log, DamageRecord, type Emote, removeFrom } from "../utils/misc";
import { Weapons, Bullets, TypeToId, Debug, RedZoneStages, Config } from "../utils/data";
import { SurvivBitStream } from "../utils/survivBitStream";
import { random, sameLayer, vecLerp, lerp, distanceBetween, randomPointInsideCircle, convertToMilliseconds, unitVecToRadians, radiansToDegrees, directionToOrientation, getOppositeOrientation } from "../utils/math";
import { GameMap } from "./map";
import { type Gun, Player } from "./objects/player";
import { AliveCountsPacket } from "../packets/sending/aliveCountsPacket";
import { UpdatePacket } from "../packets/sending/updatePacket";
import { JoinedPacket } from "../packets/sending/joinedPacket";
import { MapPacket } from "../packets/sending/mapPacket";
import { type KillPacket } from "../packets/sending/killPacket"; 
import { type GameObject } from "./gameObject";
import { Fixture, Settings, Vec2, World } from "planck";
import { RoleAnnouncementPacket } from "../packets/sending/roleAnnouncementPacket";
import { Loot } from "./objects/loot";
import { Bullet } from "./bullet";
import { Explosion } from "./explosion";
import { type Stair } from "./stair";
import { Building } from "./objects/building";  
import { type Obstacle } from "./objects/obstacle";   
import { type Projectile } from "./objects/projectile";

export class Game {  
    id: string; // The game ID. 16 hex characters, same as MD5

    map: GameMap;

    gamemode: GameMode;

    // Used when calculating visible objects
    has8x = false;
    has15x = false;

    world: World; // The Planck.js World

    staticObjects = new Set<GameObject>(); // A Set of all the static objects in the world
    dynamicObjects = new Set<GameObject>(); // A Set of all the dynamic (moving) objects in the world
    _nextObjectId = -1;
    _nextGroupId = -1;

    visibleObjects = {};
    updateObjects = false;

    partialDirtyObjects = new Set<GameObject>();
    fullDirtyObjects = new Set<GameObject>();
    deletedObjects = new Set<GameObject>();
    loot = new Set<Loot>();
    stairs = new Set<Stair>();

    players = new Set<Player>(); // All players, including dead and disconnected players.
    connectedPlayers = new Set<Player>(); // All connected players. May be dead.
    livingPlayers = new Set<Player>(); // All connected and living players.
    spectatablePlayers: Player[] = []; // Same as activePlayers, but an array. Used to navigate through players when spectating.

    newPlayers = new Set<Player>();
    deletedPlayers = new Set<Player>();

    playerInfosDirty = false;

    killLeader: { id: number, kills: number } = { id: 0, kills: 0 };
    killLeaderDirty = false;

    aliveCountDirty = false; // Whether the alive count needs to be updated

    emotes = new Set<Emote>(); // All emotes sent this tick
    explosions = new Set<Explosion>(); // All explosions created this tick
    bullets = new Set<Bullet>(); // All bullets that currently exist
    newBullets = new Set<Bullet>(); // All bullets created this tick
    aliveCounts: AliveCountsPacket;
    kills = new Set<KillPacket>(); // All kills this tick
    roleAnnouncements = new Set<RoleAnnouncementPacket>(); // All role announcements this tick
    damageRecords = new Set<DamageRecord>(); // All records of damage by bullets this tick

    projectiles = new Set<Projectile>(); // All projectiles that currently exist

    // Red zone, starting values are ignored and replaced
    readonly gas = {
        stage: 0,
        /** 0 = inactive, 1 = waiting, 2 = moving */
        mode: 0,
        initialDuration: 0,
        countdownStart: 0,
        duration: 0,
        posOld: Vec2(0,0),
        posNew: Vec2(0, 0),
        radOld: 0,
        radNew: 0,
        currentPos: Vec2(0, 0),
        currentRad: 0,
        damage: 0
    };

    gasDirty = false;
    gasCircleDirty = false;
    ticksSinceLastGasDamage = 0;

    over = false; // Whether this game is over. This is set to true to stop the tick loop.
    started = false; // Whether there are more than 2 players, meaning the game has started.
    lobbyStartTime: number; //time when a second player joins and the timer countdown starts, measured with Date.now()
    timePeriodToAllowJoin: number; //After this time period has elapsed, players can no longer join the game.
    /**
     * Whether new players should be able to join
     * can also be an indication for the "BattleRoyale" gamemode whether or not the game as officially started
     */
    allowJoin = true;
    spawnWithGoodies = false; // In late game, players spawn with ammo and healing items

    constructor(gamemode: GameMode) {
    
        this.gamemode = gamemode;
        this.id = crypto.createHash("md5").update(crypto.randomBytes(512)).digest("hex");

        if (this.gamemode == GameMode.DeathMatch){
            this.timePeriodToAllowJoin = convertToMilliseconds(5, 30);
        }else if (this.gamemode == GameMode.BattleRoyale){
            this.timePeriodToAllowJoin = convertToMilliseconds(5, 30);
        }

        // Create the Planck.js World
        this.world = new World({
            gravity: Vec2(0, 0)
        });
        Settings.maxTranslation = 5.0; // Allows bullets to travel fast

        // Handle bullet collisions
        this.world.on("begin-contact", contact => {
            // planck.js' typings don't allow us to type getUserData in a generic manner, so this
            // will have to do
            const objectA = contact.getFixtureA().getUserData() as GameObject;
            const objectB = contact.getFixtureB().getUserData() as GameObject;
            if (objectA instanceof Bullet && objectA.distance <= objectA.maxDistance && !objectA.dead) {
                objectA.dead = true;
                this.damageRecords.add(new DamageRecord(objectB, objectA.shooter, objectA));
            } else if (objectB instanceof Bullet && objectB.distance <= objectB.maxDistance && !objectB.dead) {
                objectB.dead = true;
                this.damageRecords.add(new DamageRecord(objectA, objectB.shooter, objectB));
            }
            // console.log(objectA.typeString, objectB.typeString);
        });

        // If maxLinearCorrection is set to 0, player collisions work perfectly, but loot doesn't spread out.
        // If maxLinearCorrection is greater than 0, loot spreads out, but player collisions are jittery.
        // This code solves the dilemma by setting maxLinearCorrection to the appropriate value for the object.
        this.world.on("pre-solve", contact => {
            // @ts-expect-error getUserData() should always be a GameObject
            if (contact.getFixtureA().getUserData().isLoot || contact.getFixtureB().getUserData().isLoot) Settings.maxLinearCorrection = 0.055;
            else Settings.maxLinearCorrection = 0;
        });

        // Collision filtering code:
        // - Players should collide with obstacles, but not with each other or with loot.
        // - Bullets should collide with players and obstacles, but not with each other or with loot.
        // - Loot should only collide with obstacles and other loot.
        Fixture.prototype.shouldCollide = function(that): boolean {
            // Get the objects
            const thisObject = this.getUserData() as GameObject;
            const thatObject = that.getUserData() as GameObject;

            // const display = thatObject.typeString == "" ? (thatObject as Player).name : thatObject.typeString;
            

            
            // Make sure the objects are on the same layer
            if (!sameLayer(thisObject.layer, thatObject.layer)) return false;
            
            // if (thisObject instanceof Bullet){
                //     const orientationsMatch = directionToOrientation(thisObject.direction) == thatObject.orientation || getOppositeOrientation(directionToOrientation(thisObject.direction)) == thatObject.orientation;
                //     if (thisObject.isBullet && thatObject.isObstacle && thatObject.typeString?.includes("wall_ext") && !thatObject.typeString?.includes("thicker") && orientationsMatch && (thatObject as Obstacle).bunkerWall){
                    //         // console.log(thatObject.typeString);
                    //         console.log(directionToOrientation(thisObject.direction),thatObject.typeString, thatObject.orientation, (thatObject as Obstacle).bunkerWall);
                    //         return false;
                    //     }
                    // }
                    
            // if (thisObject.isProjectile){
            //     let onStair = false;
            //     for (const stair of thisObject.game.stairs) {
            //             if (stair.check(thisObject)) {
            //                 onStair = true;
            //                 break;
            //             }
            //         }
            //         const orientationsMatch = directionToOrientation((thisObject as Projectile).direction) == thatObject.orientation || getOppositeOrientation(directionToOrientation((thisObject as Projectile).direction)) == thatObject.orientation;
            //     if (thisObject.isProjectile && thatObject.isObstacle && thatObject.typeString?.includes("wall_ext") && !thatObject.typeString?.includes("thicker") && orientationsMatch && (thatObject as Obstacle).bunkerWall){
            //             // console.log(thatObject.typeString);
            //             console.log(directionToOrientation((thisObject as Projectile).direction),thatObject.typeString, thatObject.orientation, (thatObject as Obstacle).bunkerWall);
            //             return false;
            //         }
            // }
                                    
            // if (thisObject.isProjectile){
                // console.log(thisObject.typeString + ":", directionToOrientation((thisObject as Projectile).direction), display + ":", thatObject.orientation);
            // }
            // if (thatObject.typeString == "concrete_wall_ext_25"){
                // const {height, bunkerWall, collidable, orientation} = (thatObject as Obstacle);
                // console.log(thisObject.layer);
                // console.log(height, bunkerWall, collidable, orientation);
            // }
            // const bad = [
            //     "concrete_wall_ext_5",
            //     "metal_wall_ext_5",
            //     "concrete_wall_ext_4",
            //     "concrete_wall_ext_25"
            // ];
            // if (thisObject.isProjectile && bad.includes(thatObject.typeString) && (thatObject as Obstacle).bunkerWall){
            //     return false;
            // }

            // Prevents collision with invisible walls in bunker entrances
            if (thisObject.isPlayer && thatObject.isObstacle && thisObject.layer & 0x2 && (thatObject as Obstacle).bunkerWall) {
                return false;
            } else if (thisObject.isObstacle && thatObject.isPlayer && thatObject.layer & 0x2 && (thisObject as Obstacle).bunkerWall) {
                return false;
            }

            if (thisObject.isProjectile && (thatObject as Obstacle).collidesWith.projectile) {
                return (thisObject as Projectile).zPos < (thatObject as Obstacle).height;
            } else if (thatObject.isProjectile && (thisObject as Obstacle).collidesWith.projectile) {
                return (thatObject as Projectile).zPos < (thisObject as Obstacle).height;
            }

            if (thisObject.isPlayer) return (thatObject as Player).collidesWith.player;
            else if (thisObject.isObstacle) return (thatObject as Obstacle).collidesWith.obstacle;
            else if (thisObject.isBullet) return (thatObject as unknown as Bullet).collidesWith.bullet;
            else if (thisObject.isLoot) return (thatObject as Loot).collidesWith.loot;
            else if (thisObject.isProjectile) return (thatObject as Projectile).collidesWith.projectile;
            else return false;
        };

        this.map = new GameMap(this, "main");

        this.gas.posOld = new Vec2(this.map.width/2, this.map.height/2);
        this.gas.posNew = new Vec2(this.map.width/2, this.map.height/2);

        this.gas.currentPos = new Vec2(this.map.width, this.map.height);
        this.gas.currentRad = this.map.width;

        this.tick(30);
    }

    tickTimes: number[] = [];

    tick(delay: number): void {
        setTimeout(() => {
            const tickStart = Date.now();

            // Update physics
            this.world.step(30);

            // Create an alive count packet
            if (this.aliveCountDirty) this.aliveCounts = new AliveCountsPacket(this);

            // Update loot positions
            for (const loot of this.loot) {
                if (loot.oldPos.x !== loot.position.x || loot.oldPos.y !== loot.position.y) {
                    this.partialDirtyObjects.add(loot);
                }
                loot.oldPos = loot.position.clone();
            }

            // Update bullets
            for (const bullet of this.bullets) {
                if (bullet.distance >= bullet.maxDistance) {
                    const bulletData = Bullets[bullet.typeString];

                    if (bulletData.onHit) {
                        const explosionPosition = bullet.position.clone().add(bullet.direction.clone().mul(bullet.maxDistance));
                        this.explosions.add(new Explosion(explosionPosition, bulletData.onHit, bullet.layer, bullet.shooter, bullet.shotSource));
                    }
                    this.world.destroyBody(bullet.body);
                    this.bullets.delete(bullet);
                }
            }

            // Do damage to objects hit by bullets
            for (const damageRecord of this.damageRecords) {
                const bullet = damageRecord.bullet;
                const bulletData = Bullets[bullet.typeString];

                if (bulletData.onHit) {
                    this.explosions.add(new Explosion(bullet.body.getPosition(), bulletData.onHit, bullet.layer, bullet.shooter, bullet.shotSource));
                }

                if (damageRecord.damaged.damageable) {
                    if (damageRecord.damaged instanceof Player) {
                        // console.log(bulletData);
                        damageRecord.damaged.damage(bulletData.damage, damageRecord.damager, bullet.shotSource);
                    } else {
                        damageRecord.damaged.damage(bulletData.damage * bulletData.obstacleDamage, damageRecord.damager);
                    }
                }
                this.world.destroyBody(bullet.body);
                this.bullets.delete(bullet);
            }

            // Update red zone
            if (this.gas.mode !== 0) {
                this.gas.duration = (Date.now() - this.gas.countdownStart) / 1000 / this.gas.initialDuration;
                this.gasCircleDirty = true;
            }


            // Red zone damage
            this.ticksSinceLastGasDamage++;
            let gasDamage = false;
            if (this.ticksSinceLastGasDamage >= 67) {
                this.ticksSinceLastGasDamage = 0;
                gasDamage = true;
                if (this.gas.mode === 2) {
                    this.gas.currentPos = vecLerp(this.gas.duration, this.gas.posOld, this.gas.posNew);
                    this.gas.currentRad = lerp(this.gas.duration, this.gas.radOld, this.gas.radNew);
                }
            }

            //stop players from joining game after timePeriodToAllowJoin has elapsed
            if (Date.now() - this.lobbyStartTime >= this.timePeriodToAllowJoin && this.allowJoin){
                this.allowJoin = false;
            }

            // First loop over players: Calculate movement & animations
            for (const p of this.livingPlayers) {
                // console.log(p.distanceToMouse);
                // console.log(p.distanceToMouse/p.zoom);
                // console.log(p.zoom, p.distanceToMouse);
                // Movement
                if (p.isMobile) {
                    if (this.gamemode == GameMode.DeathMatch){
                        p.setVelocity(p.touchMoveDir.x * p.speed, p.touchMoveDir.y * p.speed);
                    }else if (this.gamemode == GameMode.BattleRoyale){
                        p.setVelocity(p.touchMoveDir.x * p.speed, p.touchMoveDir.y * p.speed);
                        // if (this.allowJoin == false){
                        //     p.setVelocity(p.touchMoveDir.x * p.speed, p.touchMoveDir.y * p.speed);
                        // }
                    }
                } else {
                    if (this.gamemode == GameMode.DeathMatch){
                        p.setMovement();
                    }else if (this.gamemode == GameMode.BattleRoyale){
                        p.setMovement();
                        // //only allow players to move in battle royale after lobby closes (meaning game has started)
                        // if (this.allowJoin == false){
                        //     p.setMovement();
                        // }
                    }
                }

                // Pick up nearby items if on mobile
                if (p.isMobile) {
                    for (const object of p.visibleObjects) {
                        if (object instanceof Loot &&
                            (!object.isGun || (p.weapons[0].typeId === 0 || p.weapons[1].typeId === 0) || (Weapons[p.activeWeapon.typeString]?.dualWieldType && Weapons[object.typeString]?.dualWieldType && p.activeWeapon.typeId === object.typeId)) &&
                            !object.isMelee &&
                            distanceBetween(p.position, object.position) <= p.scale + Constants.player.touchLootRadMult) {
                            p.interactWith(object);
                        }
                    }
                }

                if (this.gamemode == GameMode.DeathMatch){
                    p.updateHealthAndAdren();

                }else if (this.gamemode == GameMode.BattleRoyale){
                    if (this.allowJoin == false){
                        p.updateHealthAndAdren();
                    }
                }

                // Red zone damage
                if (gasDamage && this.isInRedZone(p.position)) {
                    p.damage(this.gas.damage, undefined, undefined, DamageType.Gas);
                }

                //if player is being revived, cancel revive if either player move out of range
                if (p.playerBeingRevived){
                    if (distanceBetween(p.position, p.playerBeingRevived.position) > Constants.player.reviveRange){
                        p.cancelAction();
                    }
                }

                // Perform action again
                if (p.performActionAgain) {
                    p.performActionAgain = false;
                    p.doAction(p.lastActionItem.typeString, p.lastActionItem.duration, p.lastActionType);
                }

                // Action item logic
                if (p.actionDirty && Date.now() - p.actionItem.useEnd > 0) {
                    if (p.actionType === Constants.Action.UseItem) {
                        switch (p.actionItem.typeString) {
                            case "bandage":
                                p.health += 15;
                                break;
                            case "healthkit":
                                p.health = 100;
                                break;
                            case "soda":
                                p.boost += 25;
                                break;
                            case "painkiller":
                                p.boost += 50;
                                break;
                        }
                        p.inventory[p.actionItem.typeString]--;
                        p.inventoryDirty = true;
                    } else if (p.actionType === Constants.Action.Reload) {
                        const weaponInfo = p.activeWeaponInfo;
                        // let difference = Math.min(p.inventory[weaponInfo.ammo], weaponInfo.maxClip - (p.activeWeapon as Gun).ammo);
                        let difference = Math.min(p.inventory[weaponInfo.ammo], (p.activeWeapon as Gun).customClip - (p.activeWeapon as Gun).ammo);
                        //when mosin ammo reaches 0, do a full reload rather than incremental
                        if (weaponInfo.name == "Mosin-Nagant" && difference == weaponInfo.maxReloadAlt){
                            difference = weaponInfo.maxReloadAlt;
                        }else{
                            if (difference > weaponInfo.maxReload) {
                                difference = weaponInfo.maxReload;
                                p.performActionAgain = true;
                            }
                        }

                        (p.activeWeapon as Gun).ammo += difference;
                        p.inventory[weaponInfo.ammo] -= difference;
                        p.weaponsDirty = true;
                        p.inventoryDirty = true;
                    }else if (p.actionType === Constants.Action.Revive){

                        const playerRevived = p.playerBeingRevived;

                        if (playerRevived){
                            playerRevived.downed = false;
                            playerRevived.health = Constants.player.reviveHealth;
                            playerRevived.recalculateSpeed();

                            playerRevived.fullDirtyObjects.add(playerRevived);
                            this.fullDirtyObjects.add(playerRevived);

                        }
                    }
                    if (p.performActionAgain) {
                        p.lastActionItem = { ...p.actionItem };
                        p.lastActionType = p.actionType;
                    }
                    p.cancelAction();
                }

                // console.log(p.anim);
                // console.log(p.actionSeq);
                // Weapon logic
                if (p.shootStart) {
                    p.shootStart = false;
                    // I put this outside b/c it would not work inside
                    if (p.weaponCooldownOver()){
                        if (p.activeWeapon.weaponType === WeaponType.Throwable) {
                            if (!p.anim.active) {
                                p.cancelAction();
                                p.anim.active = true;
                                p.anim.type = Constants.Anim.Cook;
                                p.anim.seq = 1;
                                p.anim.time = 0;
                                p.anim.duration = 4 * 30;
                                p.fullDirtyObjects.add(p);
                                this.fullDirtyObjects.add(p);
                                p.recalculateSpeed();
                            }
                            p.ticksSinceCookStart = 0;
                        }else{
                            //we do not want the cooldown timer to start if throwing a nade
                            p.activeWeapon.cooldown = Date.now();
                            if (p.activeWeapon.weaponType === WeaponType.Melee) {
                                p.useMelee();
                            } else if (p.activeWeapon.weaponType === WeaponType.Gun) {
                                p.shootGun();
                            }
                        }
                    }
                    // if (p.weaponCooldownOver()) {
                    //     p.activeWeapon.cooldown = Date.now();
                    //     if (p.activeWeapon.weaponType === WeaponType.Melee) {
                    //         p.useMelee();
                    //     } else if (p.activeWeapon.weaponType === WeaponType.Gun) {
                    //         p.shootGun();
                    //     }
                    // }
                } else if (p.shootHold && p.activeWeapon.weaponType === WeaponType.Gun && (p.activeWeaponInfo.fireMode === "auto" || p.activeWeaponInfo.fireMode === "burst")) {
                    if (p.weaponCooldownOver()) {
                        p.activeWeapon.cooldown = Date.now();
                        p.shootGun();
                    }
                }else if (p.shootHold && p.activeWeapon.weaponType === WeaponType.Throwable && p.ticksSinceCookStart != Weapons[p.activeWeapon.typeString].fuseTime * 30){
                    if (p.weaponCooldownOver() && p.anim.active){
                        p.ticksSinceCookStart++;
                    }
                }else if (p.ticksSinceCookStart >= 0){
                    if (Date.now() - p.weapons[3].cooldown >= p.weapons[3].cooldownDuration){
                        p.weapons[3].cooldown = Date.now();
                        p.useThrowable();
                        p.anim.active = false;
                        p.anim.type = 0;
                        p.anim.seq = 0;
                        p.anim.time = -1;
                        p.anim.duration = 0;
                        p.ticksSinceCookStart = -1;
                        p.recalculateSpeed();
                        p.fullDirtyObjects.add(p);
                    }else{
                        p.ticksSinceCookStart = -1;
                    }
                } else {
                    p.ticksSinceCookStart = -1;
                    p.shooting = false;
                }

                // Animation logic
                if (p.anim.active) p.anim.time++;
                if (p.anim.time > p.anim.duration) {
                    p.anim.active = false;
                    this.fullDirtyObjects.add(p);
                    p.fullDirtyObjects.add(p);
                    p.anim.type = p.anim.seq = 0;
                    p.anim.time = -1;
                } else if (p.moving) {
                    p.game.partialDirtyObjects.add(p);
                    p.partialDirtyObjects.add(p);
                }
                p.moving = false;

                // Stair logic
                let onStair = false;
                const originalLayer = p.layer;
                for (const stair of this.stairs) {
                    if (stair.check(p)) {
                        onStair = true;
                        break;
                    }
                }
                if (!onStair) {
                    if (p.layer === 2) p.layer = 0;
                    if (p.layer === 3) p.layer = 1;
                }
                if (p.layer !== originalLayer) {
                    p.fullDirtyObjects.add(p);
                    p.game.fullDirtyObjects.add(p);
                }

                // Logic for scopes in buildings
                let playerZoomFromBuilding = 0;
                for (const building of p.nearObjects) {
                    if (building instanceof Building && building.playerIsOnZoomArea(p) !== 0) {
                        playerZoomFromBuilding = building.playerIsOnZoomArea(p);
                        break;
                    }
                }
                p.buildingZoom = playerZoomFromBuilding;
            }

            for (const proj of this.projectiles) {
                proj.update();
            }

            for (const explosion of this.explosions) {
                explosion.explode(this);
            }

            // Second loop over players: calculate visible objects & send packets
            for (const p of this.connectedPlayers) {
                // Calculate visible objects
                if (p.movesSinceLastUpdate > 8 || this.updateObjects) {
                    p.updateVisibleObjects();
                }

                // Update role
                if (p.roleLost) {
                    p.roleLost = false;
                    p.role = 0;
                }

                // Spectate logic
                if (p.spectateBegin) {
                    p.spectateBegin = false;
                    let toSpectate;
                    if ((p.killedBy != null) && !p.killedBy.dead) toSpectate = p.killedBy;
                    else toSpectate = this.randomPlayer();
                    p.spectate(toSpectate);
                } else if (p.spectateNext && (p.spectating != null)) { // TODO Remember which players were spectated so navigation works properly
                    p.spectateNext = false;
                    let index: number = this.spectatablePlayers.indexOf(p.spectating) + 1;
                    if (index >= this.spectatablePlayers.length) index = 0;
                    p.spectate(this.spectatablePlayers[index]);
                } else if (p.spectatePrevious && (p.spectating != null)) {
                    p.spectatePrevious = false;
                    let index: number = this.spectatablePlayers.indexOf(p.spectating) - 1;
                    if (index < 0) index = this.spectatablePlayers.length - 1;
                    p.spectate(this.spectatablePlayers[index]);
                }

                // Emotes
                // TODO Determine which emotes should be sent to the client
                if (this.emotes.size) {
                    for (const emote of this.emotes) {
                        if (!emote.isPing || emote.playerId === p.id) p.emotes.add(emote);
                    }
                }

                // Explosions
                // TODO Determine which explosions should be sent to the client
                if (this.explosions.size) {
                    for (const explosion of this.explosions) {
                        p.explosions.add(explosion);
                    }
                }

                // Full objects
                if (this.fullDirtyObjects.size) {
                    for (const object of this.fullDirtyObjects) {
                        if (p.visibleObjects.has(object) && !p.fullDirtyObjects.has(object)) {
                            p.fullDirtyObjects.add(object);
                        }
                    }
                }

                // Partial objects
                if (this.partialDirtyObjects.size && !p.fullUpdate) {
                    for (const object of this.partialDirtyObjects) {
                        if (p.visibleObjects.has(object) && !p.fullDirtyObjects.has(object)) {
                            p.partialDirtyObjects.add(object);
                        }
                    }
                }

                // Deleted objects
                if (this.deletedObjects.size) {
                    for (const object of this.deletedObjects) {
                        /* if(p.visibleObjects.includes(object) && object !== p) {
                            p.deletedObjects.add(object);
                        } */
                        if (object !== p) p.deletedObjects.add(object);
                    }
                }

                // Send packets
                if (!p.isSpectator) {
                    const updatePacket = new UpdatePacket(p);
                    const updateStream = SurvivBitStream.alloc(updatePacket.allocBytes);
                    updatePacket.serialize(updateStream);
                    p.sendData(updateStream);
                    for (const spectator of p.spectators) {
                        spectator.sendData(updateStream);
                    }
                }
                if (this.aliveCountDirty) p.sendPacket(this.aliveCounts);
                for (const kill of this.kills) p.sendPacket(kill);
                for (const roleAnnouncement of this.roleAnnouncements) p.sendPacket(roleAnnouncement);
            }

            // Reset everything
            if (this.fullDirtyObjects.size) this.fullDirtyObjects = new Set<GameObject>();
            if (this.partialDirtyObjects.size) this.partialDirtyObjects = new Set<GameObject>();
            if (this.deletedObjects.size) this.deletedObjects = new Set<GameObject>();

            if (this.newPlayers.size) this.newPlayers = new Set<Player>();
            if (this.deletedPlayers.size) this.deletedPlayers = new Set<Player>();

            if (this.emotes.size) this.emotes = new Set<Emote>();
            if (this.explosions.size) this.explosions = new Set<Explosion>();
            if (this.newBullets.size) this.newBullets = new Set<Bullet>();
            if (this.kills.size) this.kills = new Set<KillPacket>();
            if (this.roleAnnouncements.size) this.roleAnnouncements = new Set<RoleAnnouncementPacket>();
            if (this.damageRecords.size) this.damageRecords = new Set<DamageRecord>();

            this.gasDirty = false;
            this.gasCircleDirty = false;
            this.aliveCountDirty = false;

            // Stop the tick loop if the game is over
            if (this.over) {
                for (const player of this.connectedPlayers) {
                    try {
                        player.socket.close();
                    } catch (e) {}
                }
                return;
            }

            // Record performance and start the next tick
            const tickTime = Date.now() - tickStart;
            this.tickTimes.push(tickTime + delay);

            if (this.tickTimes.length >= 200) {
                log(`Average ms/tick: ${this.tickTimes.reduce((a, b) => a + b) / this.tickTimes.length}`);
                this.tickTimes = [];
            }

            const newDelay: number = Math.max(0, 30 - tickTime);
            this.tick(newDelay);
        }, delay);
    }

    isInRedZone(position: Vec2): boolean {
        // console.log(position, this.gas.currentPos, this.gas.currentRad);
        return distanceBetween(position, this.gas.currentPos) >= this.gas.currentRad;
    }

    get aliveCount(): number {
        return this.livingPlayers.size;
    }

    addPlayer(socket, name, loadout): Player {
        let numTeammates = 0;
        for (const player of this.livingPlayers){
            if (player.loadout.outfit == TypeToId[loadout.outfit]){
                numTeammates++;
            }
        }
        

        let groupId: number = TypeToId[loadout.outfit];
        /**
         * max number of players allowed per team
         */
       const maxTeammates = 2;
        //if numTeammates == maxTeammates, the team already has 4 people so the player can't join it
        if (numTeammates == maxTeammates){
            groupId = TypeToId["outfitBase"];
            loadout.outfit = "outfitBase";
        }

        let spawnPosition;
        if (!this.allowJoin) spawnPosition = Vec2(360, 360);
        if (Debug.fixedSpawnLocation.length) spawnPosition = Vec2(Debug.fixedSpawnLocation[0], Debug.fixedSpawnLocation[1]);
        else if (this.gas.currentRad <= 16) spawnPosition = this.gas.currentPos.clone();
        else {
            let foundPosition = false;
            while (!foundPosition) {
                //! unsafe
                spawnPosition = this.map.getRandomPositionFor(ObjectKind.Player, undefined as any, 0, 1, undefined, undefined, groupId);
                if (!this.isInRedZone(spawnPosition)) foundPosition = true;
            }
        }
        const p = new Player(spawnPosition, socket, this, name, loadout);
        this.players.add(p);
        this.connectedPlayers.add(p);
        this.newPlayers.add(p);
        this.aliveCountDirty = true;
        this.playerInfosDirty = true;
        this.updateObjects = true;
        if (!this.allowJoin) {
            p.dead = true;
            p.spectate(this.randomPlayer());
        } else {
            p.updateVisibleObjects();
            this.livingPlayers.add(p);
            this.spectatablePlayers.push(p);
            p.fullDirtyObjects.add(p);
        }

        //this is where you add loot you want to spawn on the player when they join the game
        //do NOT do it inside the constructor

        //spawn m870 next to player so they can choose between spas12 and m870
        if (p.isSpectator == false){
            new Loot(this, "m870", p.position, 0, 1);
            new Loot(this, "famas", p.position, 0, 1);
            new Loot(this, "scar", p.position, 0, 1);
            new Loot(this, "scout", p.position, 0, 1);
            new Loot(this, "deagle", p.position, 0, 1);
            new Loot(this, "model94", p.position, 0, 1);
            new Loot(this, "mk12", p.position, 0, 1);
            new Loot(this, "m249", p.position, 0, 1);
            new Loot(this, "mp220", p.position, 0, 1);
            // new Loot(this, "sv98", p.position, 0, 1);



            // new Loot(this, "mirv", p.position, 0, 1);
        }

        this.dynamicObjects.add(p);
        this.fullDirtyObjects.add(p);

        p.sendPacket(new JoinedPacket(p));
        const stream = SurvivBitStream.alloc(32768);
        new MapPacket(p).serialize(stream);
        new UpdatePacket(this.allowJoin ? p : p.spectating!).serialize(stream);
        new AliveCountsPacket(this).serialize(stream);
        p.sendData(stream);

        if (this.aliveCount > 1 && !this.started) {
            this.started = true;
            this.lobbyStartTime = Date.now();

            // setTimeout(() => {
            //     this.allowJoin = false;
            // }, this.timePeriodToAllowJoin);

            this.advanceRedZone();
        }

        return p;
    }

    advanceRedZone(): void {
        if (Debug.disableRedZone) return;
        const currentStage = RedZoneStages[this.gamemode][this.gas.stage + 1];
        if (!currentStage) return;
        this.gas.stage++;
        this.gas.mode = currentStage.mode;
        this.gas.initialDuration = currentStage.duration;
        this.gas.duration = 1;
        this.gas.countdownStart = Date.now();
        if (currentStage.mode === 1) {
            this.gas.posOld = this.gas.posNew.clone();
            // this.gas.posOld = new Vec2(100, 100);
            if (currentStage.radNew !== 0) {
                this.gas.posNew = randomPointInsideCircle(this.gas.posOld, (currentStage.radOld - currentStage.radNew)/4);
                // this.gas.posNew = randomPointInsideCircle(new Vec2(157.5,157.5), 10);
            } else {
                this.gas.posNew = this.gas.posOld.clone();
            }
            this.gas.currentPos = this.gas.posOld.clone();
            this.gas.currentRad = currentStage.radOld;
        }
        this.gas.radOld = currentStage.radOld;
        this.gas.radNew = currentStage.radNew;
        this.gas.damage = currentStage.damage;
        this.gasDirty = true;
        this.gasCircleDirty = true;

        // Start the next stage
        if (currentStage.duration !== 0) {
            setTimeout(() => this.advanceRedZone(), currentStage.duration * 1000);
        }
    }

    removePlayer(p: Player): void {
        if (this.aliveCount > 0) {
            const randomPlayer = this.randomPlayer();
            for (const spectator of p.spectators) {
                spectator.spectate(randomPlayer);
            }
            p.spectators = new Set<Player>();
        } else {
            this.end();
        }

        if (p.spectating != null) {
            p.spectating.spectators.delete(p);
            p.spectating.spectatorCountDirty = true;
        }

        p.movingUp = false;
        p.movingDown = false;
        p.movingLeft = false;
        p.movingRight = false;
        p.shootStart = false;
        p.shootHold = false;
        p.isSpectator = false;
        p.spectating = undefined;
        p.actionType = p.actionSeq = 0;
        p.anim.type = p.anim.seq = 0;

        this.livingPlayers.delete(p);
        this.connectedPlayers.delete(p);
        removeFrom(this.spectatablePlayers, p);

        if (!p.dead) {
            // If player is dead, alive count has already been decremented
            this.aliveCountDirty = true;
            
            if (false) {
                // this.dynamicObjects.delete(p);
                // this.partialDirtyObjects.delete(p);
                // this.fullDirtyObjects.delete(p);
                // this.deletedPlayers.add(p);
                // this.deletedObjects.add(p);
                

                // p.direction = Vec2(1, 0);
                p.disconnected = true;
                // p.deadPos = p.body.getPosition().clone();
                // this.world.destroyBody(p.body);
                // this.fullDirtyObjects.add(p);
            } else {
                p.direction = Vec2(1, 0);
                p.disconnected = true;
                // p.deadPos = p.body.getPosition().clone();
                if (p.downed){
                    p.damage(p.health, undefined, undefined, DamageType.Gas);
                }
                this.fullDirtyObjects.add(p); 
            }
        }
    }

    randomPlayer(): Player | undefined {
        if (this.aliveCount === 0) return;
        return [...this.livingPlayers][random(0, this.livingPlayers.size - 1)];
    }

    assignKillLeader(p: Player): void {
        this.killLeaderDirty = true;
        if (this.killLeader !== p || !p.dead) { // If the player isn't already the Kill Leader, and isn't dead.
            p.role = TypeToId.kill_leader;
            this.killLeader = p;
            this.roleAnnouncements.add(new RoleAnnouncementPacket(p, true, false));
        }
    }

    end(): void {
        log("Game ending");
        if (Config.stopServerOnGameEnd) process.exit(1);
        this.over = true;
        for (const p of this.connectedPlayers) {
            if (!p.disconnected) {
                try {
                    p.socket.close();
                } catch (e) {}
            }
        }
    }

    get nextObjectId(): number {
        this._nextObjectId++;
        return this._nextObjectId;
    }

    get nextGroupId(): number {
        this._nextGroupId++;
        return this._nextGroupId;
    }
}
