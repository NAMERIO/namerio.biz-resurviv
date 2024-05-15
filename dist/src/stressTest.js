"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const constants_1 = require("./utils/constants");
const math_1 = require("./utils/math");
const survivBitStream_1 = require("./utils/survivBitStream");
const planck_1 = require("planck");
const config = {
    address: "ws://127.0.0.1:8001/play",
    botCount: 79,
    joinDelay: 50
};
for (let i = 0; i < config.botCount; i++) {
    setTimeout(() => {
        let movingUp = false;
        let movingDown = false;
        let movingLeft = false;
        let movingRight = false;
        let shootStart = false;
        let shootHold = false;
        let interact = false;
        const ws = new ws_1.WebSocket(config.address);
        ws.on("error", console.error);
        ws.on("open", () => {
            setInterval(() => {
                const stream = survivBitStream_1.SurvivBitStream.alloc(128);
                stream.writeUint8(constants_1.MsgType.Input);
                stream.writeUint8(0);
                stream.writeBoolean(movingLeft);
                stream.writeBoolean(movingRight);
                stream.writeBoolean(movingUp);
                stream.writeBoolean(movingDown);
                stream.writeBoolean(shootStart);
                stream.writeBoolean(shootHold);
                stream.writeBoolean(false); // Portrait
                stream.writeBoolean(false); // Touch move active
                stream.writeUnitVec((0, planck_1.Vec2)(0, 0), 10); // To mouse dir
                stream.writeFloat(0, 0, 64, 8); // Distance to mouse
                // Extra inputs
                if (interact) {
                    stream.writeBits(1, 4); // Input count
                    stream.writeUint8(constants_1.InputType.Interact);
                }
                else {
                    stream.writeBits(0, 4);
                }
                stream.writeGameType(0); // Item in use
                stream.writeBits(0, 6); // Padding
                ws.send(stream.buffer.subarray(0, Math.ceil(stream.index / 8)));
            }, 30);
        });
        setInterval(() => {
            movingUp = false;
            movingDown = false;
            movingLeft = false;
            movingRight = false;
            shootStart = (0, math_1.randomBoolean)();
            shootHold = (0, math_1.randomBoolean)();
            interact = (0, math_1.randomBoolean)();
            const direction = (0, math_1.random)(1, 8);
            switch (direction) {
                case 1:
                    movingUp = true;
                    break;
                case 2:
                    movingDown = true;
                    break;
                case 3:
                    movingLeft = true;
                    break;
                case 4:
                    movingRight = true;
                    break;
                case 5:
                    movingUp = true;
                    movingLeft = true;
                    break;
                case 6:
                    movingUp = true;
                    movingRight = true;
                    break;
                case 7:
                    movingDown = true;
                    movingLeft = true;
                    break;
                case 8:
                    movingDown = true;
                    movingRight = true;
                    break;
            }
        }, 2000);
    }, config.joinDelay * i);
}
//# sourceMappingURL=stressTest.js.map