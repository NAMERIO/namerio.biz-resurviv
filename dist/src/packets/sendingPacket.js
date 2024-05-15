"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendingPacket = void 0;
class SendingPacket {
    allocBytes = 0;
    msgType;
    p;
    constructor(p) {
        this.p = p;
    }
    serialize(stream) {
        stream.writeUint8(this.msgType);
    }
}
exports.SendingPacket = SendingPacket;
//# sourceMappingURL=sendingPacket.js.map