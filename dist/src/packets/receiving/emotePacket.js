"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmotePacket = void 0;
const receivingPacket_1 = require("../receivingPacket");
const misc_1 = require("../../utils/misc");
class EmotePacket extends receivingPacket_1.ReceivingPacket {
    deserialize(stream) {
        const position = stream.readVec(0, 0, 1024, 1024, 16);
        const type = stream.readGameType();
        const isPing = stream.readBoolean();
        stream.readBits(4); // Padding
        if (!this.p.dead)
            this.p.game.emotes.add(new misc_1.Emote(this.p.id, position, type, isPing));
    }
}
exports.EmotePacket = EmotePacket;
//# sourceMappingURL=emotePacket.js.map