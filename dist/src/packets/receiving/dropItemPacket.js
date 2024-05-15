"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropItemPacket = void 0;
const receivingPacket_1 = require("../receivingPacket");
const data_1 = require("../../utils/data");
const constants_1 = require("../../utils/constants");
class DropItemPacket extends receivingPacket_1.ReceivingPacket {
    deserialize(stream) {
        const itemId = stream.readGameType();
        const itemSlot = stream.readUint8();
        const item = data_1.IdToGameType[String(itemId)];
        switch (itemSlot) {
            case constants_1.ItemSlot.Primary:
                this.p.dropItemInSlot(0, item);
                break;
            case constants_1.ItemSlot.Secondary:
                this.p.dropItemInSlot(1, item);
                break;
            case constants_1.ItemSlot.Melee:
                if (item === "fists")
                    break;
                this.p.dropItemInSlot(2, item);
                break;
            case constants_1.ItemSlot.Throwable:
                this.p.dropItemInSlot(3, item);
                break;
            default:
                break;
        }
        stream.readBits(6); // Padding
    }
}
exports.DropItemPacket = DropItemPacket;
//# sourceMappingURL=dropItemPacket.js.map