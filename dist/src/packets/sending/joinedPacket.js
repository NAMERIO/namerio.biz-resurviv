"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinedPacket = void 0;
const sendingPacket_1 = require("../sendingPacket");
const constants_1 = require("../../utils/constants");
class JoinedPacket extends sendingPacket_1.SendingPacket {
    constructor(p) {
        super(p);
        this.allocBytes = 512;
    }
    serialize(stream) {
        stream.writeUint8(constants_1.MsgType.Joined);
        stream.writeUint8(1); // Team mode
        stream.writeUint16(this.p.id); // Player ID
        stream.writeBoolean(this.p.game.started); // Game started
        stream.writeUint8(6); // Emote count
        for (let i = 0; i < 6; i++)
            stream.writeGameType(this.p.loadout.emotes[i]);
    }
}
exports.JoinedPacket = JoinedPacket;
//# sourceMappingURL=joinedPacket.js.map