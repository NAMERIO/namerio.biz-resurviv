// Import necessary modules and types
import { SendingPacket } from "../sendingPacket";
import { DamageType, MsgType } from "../../utils/constants";
import type { SurvivBitStream } from "../../utils/survivBitStream";
import { Player } from "../../game/objects/player";

// Extend SendingPacket and use Player type for killer
export class KillPacket extends SendingPacket {
    readonly damageType: number;
    readonly killer?: Player;
    readonly killedWith?: { isObstacle: any; typeId: number; };

    // Constructor with Player type for killer parameter
    constructor(p: Player, damageType: DamageType, killer?: Player, killedWith?: any) {
        super(p);
        this.damageType = damageType;
        this.killer = killer;
        this.killedWith = killedWith;
        this.msgType = MsgType.Kill;
        this.allocBytes = 32;
    }

    // Serialize method with changes for using Player type
    serialize(stream: SurvivBitStream): void {
        super.serialize(stream);
        stream.writeUint8(this.damageType);
        stream.writeGameType((this.killedWith && !this.killedWith.isObstacle) ? this.killedWith.typeId : 0);
        stream.writeMapType((this.killedWith?.isObstacle) ? this.killedWith.typeId : 0);
        stream.writeUint16(this.p!.id);
        stream.writeUint16(this.killer?.id ?? 0);
        stream.writeUint16(this.killer?.id ?? 0);
        stream.writeString(this.killer?.name ?? '');
        stream.writeUint8(this.killer?.kills ?? 0);
        stream.writeBoolean(false);
        stream.writeBoolean(true);
        stream.writeAlignToNextByte();
    }
}
