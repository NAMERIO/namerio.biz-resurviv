"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Structure = void 0;
const constants_1 = require("../../utils/constants");
const gameObject_1 = require("../gameObject");
class Structure extends gameObject_1.GameObject {
    showOnMap = false;
    layerObjIds;
    altSound = false;
    constructor(game, typeString, position, orientation, layerObjIds) {
        super(game, typeString, position, 0, orientation);
        this.kind = constants_1.ObjectKind.Structure;
        this.layerObjIds = layerObjIds;
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    serializePartial(stream) { }
    serializeFull(stream) {
        stream.writeVec(this.position, 0, 0, 1024, 1024, 16);
        stream.writeMapType(this.typeId);
        stream.writeBits(this.orientation, 2);
        stream.writeBoolean(true); // Interior sound enabled
        stream.writeBoolean(this.altSound); // Interior sound alt
        stream.writeUint16(this.layerObjIds[0]); // Layer 1 ID
        stream.writeUint16(this.layerObjIds[1]); // Layer 2 ID
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    damage(amount, source) { }
}
exports.Structure = Structure;
//# sourceMappingURL=structure.js.map