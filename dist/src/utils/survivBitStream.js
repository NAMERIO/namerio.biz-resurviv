"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurvivBitStream = void 0;
const bit_buffer_1 = require("bit-buffer");
const planck_1 = require("planck");
class SurvivBitStream extends bit_buffer_1.BitStream {
    constructor(source, byteOffset = 0, byteLength = 0) {
        super(source, byteOffset, byteLength);
    }
    static alloc(length) {
        return new SurvivBitStream(Buffer.alloc(length));
    }
    writeString(str) { this.writeASCIIString(str); }
    writeStringFixedLength(str, len) { this.writeASCIIString(str, len); }
    readString() { return this.readASCIIString(); }
    readStringFixedLength(len) { return this.readASCIIString(len); }
    writeFloat(val, min, max, bitCount) {
        const range = (1 << bitCount) - 1;
        const x = val < max ? (val > min ? val : min) : max;
        const t = (x - min) / (max - min);
        this.writeBits(t * range + 0.5, bitCount);
    }
    readFloat(min, max, bitCount) {
        const range = (1 << bitCount) - 1;
        return min + (max - min) * this.readBits(bitCount) / range;
    }
    writeVec(vec, minX, minY, maxX, maxY, bitCount) {
        this.writeFloat(vec.x, minX, maxX, bitCount);
        this.writeFloat(vec.y, minY, maxY, bitCount);
    }
    readVec(minX, minY, maxX, maxY, bitCount) {
        return (0, planck_1.Vec2)(this.readFloat(minX, maxX, bitCount), this.readFloat(minY, maxY, bitCount));
    }
    writeUnitVec(vec, bitCount) {
        this.writeVec(vec, -1, -1, 1, 1, bitCount);
    }
    readUnitVec(bitCount) {
        return this.readVec(-1, -1, 1, 1, bitCount);
    }
    writeVec32(vec) {
        this.writeFloat32(vec.x);
        this.writeFloat32(vec.y);
    }
    readVec32() {
        return (0, planck_1.Vec2)(this.readFloat32(), this.readFloat32());
    }
    writeAlignToNextByte() {
        const offset = 8 - this.index % 8;
        if (offset < 8)
            this.writeBits(0, offset);
    }
    readAlignToNextByte() {
        const offset = 8 - this.index % 8;
        if (offset < 8)
            this.readBits(offset);
    }
    writeGameType(id) {
        this.writeBits(id, 10);
    }
    readGameType() {
        return this.readBits(10);
    }
    writeMapType(id) {
        this.writeBits(id, 12);
    }
    readMapType() {
        return this.readBits(12);
    }
}
exports.SurvivBitStream = SurvivBitStream;
//# sourceMappingURL=survivBitStream.js.map