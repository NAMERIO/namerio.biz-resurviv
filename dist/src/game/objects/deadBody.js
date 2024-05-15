"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadBody = void 0;
const constants_1 = require("../../utils/constants");
const gameObject_1 = require("../gameObject");
class DeadBody extends gameObject_1.GameObject {
    playerId;
    constructor(game, layer, position, playerId) {
        super(game, "", position, layer);
        this.kind = constants_1.ObjectKind.DeadBody;
        this.playerId = playerId;
    }
    serializePartial(stream) {
        stream.writeVec(this.position, 0, 0, 1024, 1024, 16);
    }
    serializeFull(stream) {
        stream.writeUint8(this.layer);
        stream.writeUint16(this.playerId);
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    damage(amount, source) { }
}
exports.DeadBody = DeadBody;
//# sourceMappingURL=deadBody.js.map