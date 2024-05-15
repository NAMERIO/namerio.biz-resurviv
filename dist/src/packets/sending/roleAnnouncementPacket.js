"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleAnnouncementPacket = void 0;
const sendingPacket_1 = require("../sendingPacket");
const constants_1 = require("../../utils/constants");
class RoleAnnouncementPacket extends sendingPacket_1.SendingPacket {
    assigned;
    killed;
    killer;
    constructor(p, assigned, killed, killer) {
        super(p);
        this.assigned = assigned;
        this.killed = killed;
        this.killer = killer;
        this.msgType = constants_1.MsgType.RoleAnnouncement;
        this.allocBytes = 8;
    }
    serialize(stream) {
        const p = this.p;
        super.serialize(stream);
        stream.writeUint16(p.id);
        stream.writeUint16((this.killer != null) ? this.killer.id : 0);
        stream.writeGameType(p.role);
        stream.writeBoolean(this.assigned);
        stream.writeBoolean(this.killed);
        // Padding
        stream.writeBits(0, 1);
        stream.writeAlignToNextByte();
    }
}
exports.RoleAnnouncementPacket = RoleAnnouncementPacket;
//# sourceMappingURL=roleAnnouncementPacket.js.map