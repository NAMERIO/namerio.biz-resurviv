"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinPacket = void 0;
const receivingPacket_1 = require("../receivingPacket");
class JoinPacket extends receivingPacket_1.ReceivingPacket {
    deserialize(stream) {
        stream.readUint32(); // Protocol
        stream.readString(); // matchPriv
        stream.readString(); // loadoutPriv
        stream.readString(); // questPriv
        stream.readString(); // Name
        stream.readBoolean(); // Use touch
        stream.readBoolean(); // Is mobile
        stream.readBoolean(); // Is proxy
        stream.readBoolean(); // Other proxy
        stream.readBoolean(); // Is bot
        stream.readAlignToNextByte(); // Padding
    }
}
exports.JoinPacket = JoinPacket;
//# sourceMappingURL=joinPacket.js.map