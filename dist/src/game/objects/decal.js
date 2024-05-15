"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Decal = void 0;
const constants_1 = require("../../utils/constants");
const gameObject_1 = require("../gameObject");
// TODO: decal life time
class Decal extends gameObject_1.GameObject {
    // club pool
    goreKills = 0;
    constructor(typeString, game, position, layer, orientation, scale) {
        super(game, typeString, position, layer, orientation);
        this.kind = constants_1.ObjectKind.Decal;
        this.scale = scale ?? 1;
    }
    serializePartial(stream) {
        stream.writeVec(this.position, 0, 0, 1024, 1024, 16);
    }
    serializeFull(stream) {
        stream.writeFloat(this.scale, constants_1.Constants.MapObjectMinScale, constants_1.Constants.MapObjectMaxScale, 8);
        stream.writeMapType(this.typeId);
        stream.writeBits(this.orientation, 2);
        stream.writeBits(this.layer, 2);
        stream.writeUint8(this.goreKills);
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    damage(amount, source) { }
}
exports.Decal = Decal;
//# sourceMappingURL=decal.js.map