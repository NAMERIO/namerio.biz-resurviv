"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AliveCountsPacket = void 0;
const sendingPacket_1 = require("../sendingPacket");
const constants_1 = require("../../utils/constants");
class AliveCountsPacket extends sendingPacket_1.SendingPacket {
    game;
    constructor(game) {
        super();
        this.msgType = constants_1.MsgType.AliveCounts;
        this.allocBytes = 3;
        this.game = game;
    }
    serialize(stream) {
        super.serialize(stream);
        stream.writeUint8(1); // Team count (2 for 50v50, 1 for everything else)
        stream.writeUint8(this.game.aliveCount);
    }
}
exports.AliveCountsPacket = AliveCountsPacket;
//# sourceMappingURL=aliveCountsPacket.js.map