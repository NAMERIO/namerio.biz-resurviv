"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PickupMsgType = exports.PickupPacket = void 0;
const sendingPacket_1 = require("../sendingPacket");
const constants_1 = require("../../utils/constants");
const data_1 = require("../../utils/data");
class PickupPacket extends sendingPacket_1.SendingPacket {
    type;
    count;
    message;
    constructor(type, count, message) {
        super();
        this.msgType = constants_1.MsgType.Pickup;
        this.allocBytes = 5;
        this.type = type;
        this.count = count;
        this.message = message;
    }
    serialize(stream) {
        super.serialize(stream);
        stream.writeUint8(this.message);
        stream.writeGameType(data_1.TypeToId[this.type]);
        stream.writeUint8(this.count);
        stream.writeBits(0, 5); // Padding
    }
}
exports.PickupPacket = PickupPacket;
var PickupMsgType;
(function (PickupMsgType) {
    PickupMsgType[PickupMsgType["Full"] = 0] = "Full";
    PickupMsgType[PickupMsgType["AlreadyOwned"] = 1] = "AlreadyOwned";
    PickupMsgType[PickupMsgType["AlreadyEquipped"] = 2] = "AlreadyEquipped";
    PickupMsgType[PickupMsgType["BetterItemEquipped"] = 3] = "BetterItemEquipped";
    PickupMsgType[PickupMsgType["Success"] = 4] = "Success";
    PickupMsgType[PickupMsgType["GunCannotFire"] = 5] = "GunCannotFire";
})(PickupMsgType || (exports.PickupMsgType = PickupMsgType = {}));
//# sourceMappingURL=pickupPacket.js.map