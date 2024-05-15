"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KillPacket = void 0;
// Import necessary modules and types
const sendingPacket_1 = require("../sendingPacket");
const constants_1 = require("../../utils/constants");
// Extend SendingPacket and use Player type for killer
class KillPacket extends sendingPacket_1.SendingPacket {
    damageType;
    killer;
    killedWith;
    // Constructor with Player type for killer parameter
    constructor(p, damageType, killer, killedWith) {
        super(p);
        this.damageType = damageType;
        this.killer = killer;
        this.killedWith = killedWith;
        this.msgType = constants_1.MsgType.Kill;
        this.allocBytes = 32;
    }
    // Serialize method with changes for using Player type
    serialize(stream) {
        super.serialize(stream);
        stream.writeUint8(this.damageType);
        stream.writeGameType((this.killedWith && !this.killedWith.isObstacle) ? this.killedWith.typeId : 0);
        stream.writeMapType((this.killedWith?.isObstacle) ? this.killedWith.typeId : 0);
        stream.writeUint16(this.p.id);
        stream.writeUint16(this.killer?.id ?? 0);
        stream.writeUint16(this.killer?.id ?? 0);
        stream.writeString(this.killer?.name ?? '');
        stream.writeUint8(this.killer?.kills ?? 0);
        stream.writeBoolean(false);
        stream.writeBoolean(true);
        stream.writeAlignToNextByte();
    }
}
exports.KillPacket = KillPacket;
//# sourceMappingURL=killPacket.js.map