"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitUpLoot = exports.generateLooseLootFromArray = exports.Loot = void 0;
const constants_1 = require("../../utils/constants");
const misc_1 = require("../../utils/misc");
const data_1 = require("../../utils/data");
const math_1 = require("../../utils/math");
const gameObject_1 = require("../gameObject");
const pickupPacket_1 = require("../../packets/sending/pickupPacket");
const planck_1 = require("planck");
class Loot extends gameObject_1.GameObject {
    isPlayer = false;
    isObstacle = false;
    isBullet = false;
    isLoot = true;
    collidesWith = {
        player: false,
        obstacle: true,
        bullet: false,
        loot: true,
        projectile: false
    };
    count;
    interactable = true;
    interactionRad = 1;
    isGun = false;
    isThrowable = false;
    isMelee = false;
    isAmmo = false;
    oldPos;
    constructor(game, typeString, position, layer = 0, count = 0) {
        if (!data_1.TypeToId[typeString]) {
            (0, misc_1.log)(`[WARNING] Unknown loot item: ${typeString}`);
            typeString = "9mm";
            count = 60;
        }
        //8xs and 15xs are unfair so theyre not allowed to spawn
        super(game, typeString, position || (0, planck_1.Vec2)(0, 0), layer); // Ensure a default position if not provided
        if (typeString == "8xscope" || typeString == "15xscope") {
            return;
        }
        this.kind = constants_1.ObjectKind.Loot;
        this.count = count;
        this.isGun = data_1.Weapons[typeString]?.type === "gun";
        this.isMelee = data_1.Weapons[typeString]?.type === "melee";
        this.isAmmo = data_1.Items[typeString]?.type === "ammo";
        let radius;
        if (this.isGun)
            radius = constants_1.Constants.lootRadius.gun;
        else if (this.isMelee)
            radius = constants_1.Constants.lootRadius.melee;
        else if (this.isAmmo)
            radius = constants_1.Constants.lootRadius.ammo;
        else
            radius = 1;
        this.interactionRad = radius;
        this.isThrowable = data_1.Weapons[typeString]?.type === "throwable";
        this.oldPos = position || (0, planck_1.Vec2)(0, 0); // Ensure a default position if not provided
        // Create the body
        this.body = game.world.createBody({
            type: "dynamic",
            position: position || (0, planck_1.Vec2)(0, 0), // Ensure a default position if not provided
            linearDamping: 0.003
        });
        this.body.createFixture({
            shape: (0, planck_1.Circle)(radius),
            restitution: 0.5,
            density: 0.0,
            friction: 0.0,
            userData: this
        });
        // Push the loot in a random direction
        const angle = Math.random() * Math.PI * 2;
        this.body.setLinearVelocity((0, planck_1.Vec2)(Math.cos(angle), Math.sin(angle)).mul(0.005));
        game.loot.add(this);
        game.dynamicObjects.add(this);
        game.fullDirtyObjects.add(this);
        game.updateObjects = true;
        const livingPlayerCount = game.livingPlayers.size;
        const deleteTime = livingPlayerCount > 10 ? 5000 : 30000;
        setTimeout(() => {
            this.delete();
        }, deleteTime);
    }
    get position() {
        return this.body.getPosition();
    }
    interact(p) {
        if (data_1.Weapons[this.typeString]?.type === "throwable") {
            return;
        }
        let result = pickupPacket_1.PickupMsgType.Success;
        let deleteItem = true;
        let playerDirty = false;
        let ignore = false;
        if (this.typeString.endsWith("scope")) {
            if (p.inventory[this.typeString] > 0)
                result = pickupPacket_1.PickupMsgType.AlreadyEquipped;
            else {
                p.inventory[this.typeString]++;
                if (data_1.Items[this.typeString].level > data_1.Items[p.scope.typeString].level) {
                    p.setScope(this.typeString);
                }
            }
        }
        else if (this.typeString.startsWith("backpack")) {
            result = this.pickUpTieredItem("backpack", p);
            playerDirty = true;
        }
        else if (this.typeString.startsWith("chest")) {
            result = this.pickUpTieredItem("chest", p);
            playerDirty = true;
        }
        else if (this.typeString.startsWith("helmet")) {
            result = this.pickUpTieredItem("helmet", p);
            playerDirty = true;
        }
        else if (this.typeString.startsWith("outfit")) {
            if (p.loadout.outfit === this.typeId) {
                result = pickupPacket_1.PickupMsgType.AlreadyOwned;
            }
            else {
                this.game.dynamicObjects.add(new Loot(this.game, data_1.IdToGameType[p.loadout.outfit], this.position, p.layer, 1));
                p.loadout.outfit = this.typeId;
                playerDirty = true;
            }
        }
        else if (constants_1.Constants.bagSizes[this.typeString]) {
            // Throwables implementation [inside here cus it's tiered]
            if (data_1.Weapons[this.typeString]?.type === "throwable") {
                p.weapons[3].typeString = this.typeString;
                p.weapons[3].typeId = this.typeId;
                if (p.activeWeapon.weaponType == constants_1.WeaponType.Melee) {
                    p.switchSlot(3);
                }
            }
            // if it is ammo or a healing item or a grenade
            const currentCount = p.inventory[this.typeString];
            const maxCapacity = constants_1.Constants.bagSizes[this.typeString][p.backpackLevel];
            if (currentCount + this.count <= maxCapacity) {
                p.inventory[this.typeString] += this.count;
            }
            else if (currentCount + 1 > maxCapacity) {
                result = pickupPacket_1.PickupMsgType.Full;
            }
            else if (currentCount + this.count > maxCapacity) {
                p.inventory[this.typeString] = maxCapacity;
                this.count = (currentCount + this.count) - maxCapacity;
                this.game.fullDirtyObjects.add(this);
                deleteItem = false;
            }
            // Reload active gun if the player picks up the correct ammo
            if (p.activeWeapon.ammo === 0 && this.typeString === p.activeWeaponInfo.ammo)
                p.reload();
        }
        else if (data_1.Weapons[this.typeString]?.type === "melee") {
            let slotSwitchingTo;
            if (p.weapons[2].typeString === this.typeString) {
                result = pickupPacket_1.PickupMsgType.AlreadyEquipped;
            }
            else if (p.weapons[2].typeString !== "fists") { // TODO Do item type check in drop item packet, not in drop item method
                p.dropItemInSlot(2, p.weapons[2].typeString, true);
                slotSwitchingTo = 2;
            }
            p.weapons[2].typeString = this.typeString;
            p.weapons[2].typeId = this.typeId;
            if (slotSwitchingTo === undefined) {
                slotSwitchingTo = p.selectedWeaponSlot === 2 ? 2 : undefined;
            }
            if (slotSwitchingTo !== undefined) {
                p.switchSlot(slotSwitchingTo);
            }
            p.weaponsDirty = true;
        }
        else {
            let slotSwitchingTo;
            // if it is a gun
            const canDualWield = !!data_1.Weapons[this.typeString]?.dualWieldType;
            if (canDualWield && p.weapons[0].typeId === this.typeId) {
                const gunTypeString = data_1.Weapons[this.typeString]?.dualWieldType;
                p.weapons[0].typeString = gunTypeString;
                p.weapons[0].typeId = data_1.TypeToId[gunTypeString];
                p.weapons[0].customClip = data_1.Weapons[gunTypeString].maxClip;
                slotSwitchingTo = 0;
            }
            else if (canDualWield && p.weapons[1].typeId === this.typeId) {
                const gunTypeString = data_1.Weapons[this.typeString]?.dualWieldType;
                p.weapons[1].typeString = gunTypeString;
                p.weapons[1].typeId = data_1.TypeToId[gunTypeString];
                p.weapons[1].customClip = data_1.Weapons[gunTypeString].maxClip;
                slotSwitchingTo = 1;
            }
            else if (p.weapons[0].typeId === 0) {
                p.weapons[0].typeString = this.typeString;
                p.weapons[0].typeId = this.typeId;
                p.weapons[0].customClip = data_1.Weapons[this.typeString].maxClip;
                slotSwitchingTo = 0;
            }
            else if (p.weapons[0].typeId !== 0 && p.weapons[1].typeId === 0) {
                p.weapons[1].typeString = this.typeString;
                p.weapons[1].typeId = this.typeId;
                p.weapons[1].customClip = data_1.Weapons[this.typeString].maxClip;
                slotSwitchingTo = 1;
            }
            else if (p.selectedWeaponSlot === 0 || p.selectedWeaponSlot === 1) {
                if (p.activeWeapon.typeString === this.typeString)
                    ignore = true;
                else {
                    p.dropItemInSlot(p.selectedWeaponSlot, p.activeWeapon.typeString, true);
                    p.activeWeapon.typeString = this.typeString;
                    p.activeWeapon.typeId = this.typeId;
                    p.activeWeapon.customClip = data_1.Weapons[this.typeString].maxClip;
                    slotSwitchingTo = p.selectedWeaponSlot;
                }
            }
            else
                ignore = true;
            if (!ignore) {
                p.weaponsDirty = true;
                playerDirty = true;
                p.cancelAction();
                p.switchSlot(slotSwitchingTo);
            }
        }
        if (!(p.isMobile && result !== pickupPacket_1.PickupMsgType.Success) && !ignore) {
            p.sendPacket(new pickupPacket_1.PickupPacket(this.typeString, this.count, result));
        }
        if (result === pickupPacket_1.PickupMsgType.Success && !ignore) {
            if (playerDirty) {
                this.game?.fullDirtyObjects.add(p);
                p.fullDirtyObjects.add(p);
            }
            p.inventoryDirty = true;
            p.inventoryEmpty = false;
        }
        else if (!ignore) {
            deleteItem = false;
        }
        // Delete the original loot item if it's not ignored
        if (!ignore) {
            this.game.dynamicObjects.delete(this);
            this.game.loot.delete(this);
            this.game.deletedObjects.add(this);
            this.game.world.destroyBody(this.body);
            this.interactable = false;
        }
        // Create a new loot item, even if nothing was picked up
        if (!deleteItem) {
            const angle = (0, math_1.unitVecToRadians)(p.direction);
            const invertedAngle = (angle + Math.PI) % (2 * Math.PI);
            /* eslint-disable-next-line no-new */
            new Loot(this.game, this.typeString, this.position.add((0, planck_1.Vec2)(0.4 * Math.cos(invertedAngle), 0.4 * Math.sin(invertedAngle))), this.layer, this.count);
        }
    }
    canPickUpItem(p) {
        if (this.typeString.endsWith("scope")) {
            return p.inventory[this.typeString] === 0;
        }
        else if (this.typeString.startsWith("backpack")) {
            return this.canPickUpTieredItem("backpack", p);
        }
        else if (this.typeString.startsWith("chest")) {
            return this.canPickUpTieredItem("chest", p);
        }
        else if (this.typeString.startsWith("helmet")) {
            return this.canPickUpTieredItem("helmet", p);
        }
        else if (constants_1.Constants.bagSizes[this.typeString]) { // if it is ammo or a healing item
            const currentCount = p.inventory[this.typeString];
            const maxCapacity = constants_1.Constants.bagSizes[this.typeString][p.backpackLevel];
            return currentCount + 1 <= maxCapacity;
        }
        else if (data_1.Weapons[this.typeString]?.type === "melee") {
            return p.weapons[2].typeString !== this.typeString;
        }
        else { // if it is a gun
            const canDualWield = Boolean(data_1.Weapons[this.typeString]?.dualWieldType);
            if ((canDualWield && (p.weapons[0].typeId === this.typeId || p.weapons[1].typeId === this.typeId)) || p.weapons[0].typeId === 0 || p.weapons[1].typeId === 0) {
                return true;
            }
            else if (p.selectedWeaponSlot === 0 || p.selectedWeaponSlot === 1) {
                return p.activeWeapon.typeString !== this.typeString;
            }
            else
                return false;
        }
    }
    pickUpTieredItem(type, p) {
        const oldLevel = p[`${type}Level`];
        const newLevel = parseInt(this.typeString.charAt(this.typeString.length - 1)); // Last digit of the ID is the item level
        if (newLevel < oldLevel)
            return pickupPacket_1.PickupMsgType.BetterItemEquipped;
        else if (newLevel === oldLevel)
            return pickupPacket_1.PickupMsgType.AlreadyEquipped;
        else {
            p[`${type}Level`] = newLevel;
            if (oldLevel !== 0) { // If oldLevel === 0, the player didn't have an item of this type equipped, so don't drop loot
                // Example: if type = helmet and p.helmetLevel = 1, typeString = helmet01
                /* eslint-disable-next-line no-new */
                new Loot(this.game, `${type}0${oldLevel}`, this.position, this.layer, 1);
            }
        }
        return pickupPacket_1.PickupMsgType.Success;
    }
    canPickUpTieredItem(type, p) {
        const oldLevel = p[`${type}Level`];
        const newLevel = parseInt(this.typeString.charAt(this.typeString.length - 1)); // Last digit of the ID is the item level
        return newLevel > oldLevel;
    }
    serializePartial(stream) {
        stream.writeVec(this.position, 0, 0, 1024, 1024, 16);
    }
    serializeFull(stream) {
        stream.writeGameType(this.typeId);
        stream.writeUint8(this.count);
        stream.writeBits(this.layer, 2);
        stream.writeBoolean(false); // Is old
        stream.writeBoolean(false); // Is preloaded gun
        stream.writeBoolean(false); // Has owner
        stream.writeBits(0, 1); // Padding
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    damage(amount, source) { }
    delete() {
        this.game.dynamicObjects.delete(this);
        this.game.loot.delete(this);
        this.game.deletedObjects.add(this);
        this.game.world.destroyBody(this.body);
        this.interactable = false;
    }
}
exports.Loot = Loot;
function generateLooseLootFromArray(game, loot, position, layer) {
    for (let i = 0; i < loot.length; i++) {
        for (let j = 0; j < (0, math_1.random)(loot[i].min, loot[i].max); j++) {
            const lootTable = data_1.LootTables[loot[i].tier];
            if (!lootTable)
                return;
            const items = [];
            const weights = [];
            for (const item in lootTable) {
                items.push(item);
                weights.push(lootTable[item].weight);
            }
            let selectedItem = (0, math_1.weightedRandom)(items, weights);
            if (selectedItem === "nothing")
                continue;
            if (selectedItem.startsWith("tier_")) {
                const lootItem = (0, misc_1.deepCopy)(loot[i]);
                lootItem.tier = selectedItem;
                generateLooseLootFromArray(game, [lootItem], position, layer);
            }
            else {
                /* eslint-disable no-new */
                new Loot(game, selectedItem, position, layer, lootTable[selectedItem].count);
                const weapon = data_1.Weapons[selectedItem];
                if (weapon?.ammo) {
                    if (weapon.ammoSpawnCount === 1) {
                        new Loot(game, weapon.ammo, position, layer, 1);
                    }
                    else {
                        const count = weapon.ammoSpawnCount / 2;
                        new Loot(game, weapon.ammo, planck_1.Vec2.add(position, (0, planck_1.Vec2)(-1.5, -1.5)), layer, count);
                        new Loot(game, weapon.ammo, planck_1.Vec2.add(position, (0, planck_1.Vec2)(1.5, -1.5)), layer, count);
                        /* eslint-enable no-new */
                    }
                }
            }
        }
    }
}
exports.generateLooseLootFromArray = generateLooseLootFromArray;
function splitUpLoot(player, item, amount) {
    const dropCount = Math.floor(amount / 60);
    for (let i = 0; i < dropCount; i++) {
        /* eslint-disable-next-line no-new */
        new Loot(player.game, item, player.position, player.layer, 60);
    }
    /* eslint-disable-next-line no-new */
    if (amount % 60 !== 0)
        new Loot(player.game, item, player.position, player.layer, amount % 60);
}
exports.splitUpLoot = splitUpLoot;
//# sourceMappingURL=loot.js.map