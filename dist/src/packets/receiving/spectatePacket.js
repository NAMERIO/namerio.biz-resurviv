"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpectatePacket = void 0;
const receivingPacket_1 = require("../receivingPacket");
class SpectatePacket extends receivingPacket_1.ReceivingPacket {
    deserialize(stream) {
        const p = this.p;
        p.spectateBegin = stream.readBoolean(); // Spectate begin
        p.spectateNext = stream.readBoolean(); // Spectate next
        p.spectatePrevious = stream.readBoolean(); // Spectate previous
        p.spectateForce = stream.readBoolean(); // Spectate force
        stream.readBits(4); // Padding
    }
}
exports.SpectatePacket = SpectatePacket;
//# sourceMappingURL=spectatePacket.js.map