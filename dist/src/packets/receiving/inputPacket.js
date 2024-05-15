"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputPacket = void 0;
const receivingPacket_1 = require("../receivingPacket");
const constants_1 = require("../../utils/constants");
const math_1 = require("../../utils/math");
const data_1 = require("../../utils/data");
const planck_1 = require("planck");
const loot_1 = require("../../game/objects/loot");
let i = 0;
class InputPacket extends receivingPacket_1.ReceivingPacket {
    deserialize(stream) {
        const p = this.p;
        if (p.dead)
            return;
        stream.readUint8(); // Discard second byte (this.seq)
        // Movement
        p.movingLeft = stream.readBoolean();
        p.movingRight = stream.readBoolean();
        p.movingUp = stream.readBoolean();
        p.movingDown = stream.readBoolean();
        // Shooting
        const shootStart = stream.readBoolean();
        p.shootStart = p.shootStart ? true : shootStart;
        p.shootHold = stream.readBoolean();
        // Mobile stuff
        stream.readBoolean(); // Portrait
        const touchMoveActive = stream.readBoolean();
        if (touchMoveActive) {
            if (!p.isMobile) {
                p.isMobile = true;
                p.zoom = constants_1.Constants.scopeZoomRadius.mobile["1xscope"];
            }
            p.touchMoveDir = stream.readUnitVec(8);
            // Detect when the player isn't moving
            if (p.touchMoveDir.x === 1 && p.touchMoveDir.y > 0 && p.touchMoveDir.y < 0.01) {
                p.touchMoveDir = (0, planck_1.Vec2)(0, 0);
            }
            stream.readUint8(); // Touch move len
        }
        // Direction
        const direction = stream.readUnitVec(10);
        if (p.direction !== direction) {
            // if (p.direction.x !== direction.x && p.direction.y !== direction.y) {
            p.direction = direction;
            p.moving = true;
        }
        p.distanceToMouse = stream.readFloat(0, constants_1.Constants.MouseMaxDist, 8); // Distance to mouse
        // Other inputs
        const inputCount = stream.readBits(4);
        for (let i = 0; i < inputCount; i++) {
            const input = stream.readUint8();
            switch (input) { // TODO Remove redundant code
                case constants_1.InputType.Interact: {
                    //if theres no revive keybind set default to interact keybind
                    p.revive();
                    let minDistInteractable = Number.MAX_VALUE;
                    let minDist = Number.MAX_VALUE;
                    let minDistInteractableObject, minDistObject;
                    for (const object of p.visibleObjects) {
                        if (object.interactable && (0, math_1.sameLayer)(p.layer, object.layer)) {
                            const record = (0, math_1.objectCollision)(object, p.position, p.scale + object.interactionRad);
                            if (record?.collided) {
                                if (object.isDoor)
                                    p.interactWith(object);
                                else if (record.distance < minDist) {
                                    if (record.distance < minDistInteractable && (!(object instanceof loot_1.Loot) || object.canPickUpItem(p))) {
                                        minDistInteractable = record.distance;
                                        minDistInteractableObject = object;
                                    }
                                    minDist = record.distance;
                                    minDistObject = object;
                                }
                            }
                        }
                    }
                    if (minDistInteractableObject) {
                        p.interactWith(minDistInteractableObject);
                    }
                    else if (minDistObject) {
                        p.interactWith(minDistObject);
                    }
                    break;
                }
                case constants_1.InputType.Loot: {
                    let minDistInteractable = Number.MAX_VALUE;
                    let minDist = Number.MAX_VALUE;
                    let minDistInteractableObject, minDistObject;
                    for (const object of p.visibleObjects) {
                        if (object instanceof loot_1.Loot && object.interactable && (0, math_1.sameLayer)(p.layer, object.layer)) {
                            const record = (0, math_1.objectCollision)(object, p.position, p.scale + object.interactionRad);
                            if (record?.collided && record.distance < minDist) {
                                if (record.distance < minDistInteractable && object.canPickUpItem(p)) {
                                    minDistInteractable = record.distance;
                                    minDistInteractableObject = object;
                                }
                                minDist = record.distance;
                                minDistObject = object;
                            }
                        }
                    }
                    if (minDistInteractableObject) {
                        p.interactWith(minDistInteractableObject);
                    }
                    else if (minDistObject) {
                        p.interactWith(minDistObject);
                    }
                    break;
                }
                case constants_1.InputType.Use: {
                    for (const object of p.visibleObjects) {
                        if ((object.isDoor || object.isButton || object.isPuzzlePiece) && (0, math_1.sameLayer)(object.layer, p.layer)) {
                            const record = (0, math_1.objectCollision)(object, p.position, p.scale + object.interactionRad);
                            if (record?.collided)
                                p.interactWith(object);
                        }
                    }
                    break;
                }
                case constants_1.InputType.EquipPrimary:
                    p.switchSlot(0);
                    break;
                case constants_1.InputType.EquipSecondary:
                    p.switchSlot(1);
                    break;
                case constants_1.InputType.EquipMelee:
                    p.switchSlot(2);
                    break;
                case constants_1.InputType.EquipThrowable:
                    p.switchSlot(3);
                    break;
                case constants_1.InputType.EquipPrevWeap:
                    p.switchSlot(p.selectedWeaponSlot - 1, true);
                    break;
                case constants_1.InputType.EquipNextWeap:
                    p.switchSlot(p.selectedWeaponSlot + 1, true);
                    break;
                case constants_1.InputType.SwapWeapSlots:
                    p.swapWeaponSlots();
                    break;
                case constants_1.InputType.EquipOtherGun:
                    if (p.weapons[0]?.typeId && p.weapons[1]?.typeId)
                        p.switchSlot(p.selectedWeaponSlot === 0 ? 1 : 0);
                    else if (p.selectedWeaponSlot === 2 && p.weapons[0]?.typeId)
                        p.switchSlot(0);
                    else if (p.selectedWeaponSlot === 2 && p.weapons[1]?.typeId)
                        p.switchSlot(1);
                    else
                        p.switchSlot(2);
                    break;
                case constants_1.InputType.EquipLastWeap:
                    p.switchSlot(p.lastWeaponSlot);
                    break;
                case constants_1.InputType.EquipNextScope:
                    p.setScope(constants_1.ScopeTypes[constants_1.ScopeTypes.indexOf(p.scope.typeString) + 1], true);
                    break;
                case constants_1.InputType.EquipPrevScope:
                    p.setScope(constants_1.ScopeTypes[constants_1.ScopeTypes.indexOf(p.scope.typeString) - 1], true);
                    break;
                case constants_1.InputType.Reload:
                    p.reload();
                    break;
                case constants_1.InputType.Cancel:
                    p.cancelAction();
                    break;
                case constants_1.InputType.StowWeapons:
                    p.switchSlot(2);
                    break;
                case constants_1.InputType.UseBandage:
                    p.useBandage();
                    break;
                case constants_1.InputType.UseHealthKit:
                    p.useMedkit();
                    break;
                case constants_1.InputType.UseSoda:
                    p.useSoda();
                    break;
                case constants_1.InputType.UsePainkiller:
                    p.usePills();
                    break;
                case constants_1.InputType.Revive:
                    p.revive();
                    break;
            }
        }
        // Item use logic
        switch (stream.readGameType()) {
            case data_1.TypeToId.bandage:
                p.useBandage();
                break;
            case data_1.TypeToId.healthkit:
                p.useMedkit();
                break;
            case data_1.TypeToId.soda:
                p.useSoda();
                break;
            case data_1.TypeToId.painkiller:
                p.usePills();
                break;
            case data_1.TypeToId["1xscope"]:
                p.setScope("1xscope");
                break;
            case data_1.TypeToId["2xscope"]:
                p.setScope("2xscope");
                break;
            case data_1.TypeToId["4xscope"]:
                p.setScope("4xscope");
                break;
            case data_1.TypeToId["8xscope"]:
                p.setScope("8xscope");
                break;
            case data_1.TypeToId["15xscope"]:
                p.setScope("15xscope");
                break;
        }
        stream.readBits(6); // Padding
    }
}
exports.InputPacket = InputPacket;
//# sourceMappingURL=inputPacket.js.map