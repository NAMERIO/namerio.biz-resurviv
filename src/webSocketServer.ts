import {
    App,
    DEDICATED_COMPRESSOR_256KB,
    SSLApp,
    type WebSocket
} from "uWebSockets.js";
import cookie from "cookie"; 

import { Game } from "./game/game";
import type { Player } from "./game/objects/player";

import { InputPacket } from "./packets/receiving/inputPacket"; 
import { EmotePacket } from "./packets/receiving/emotePacket";
import { JoinPacket } from "./packets/receiving/joinPacket";
import { DropItemPacket } from "./packets/receiving/dropItemPacket";
import { SpectatePacket } from "./packets/receiving/spectatePacket"; 

import { log } from "./utils/misc";
import { GameMode, MsgType } from "./utils/constants";
import { Config } from "./utils/data";   
import { SurvivBitStream } from "./utils/survivBitStream"; 
import * as fs from 'fs';

interface Socket extends WebSocket<Record<string, never>> {
    ip: string
    cookies: ReturnType<typeof cookie["parse"]>
    player: Player
}

let playerIPs: { [key: string]: string } = {};

// Initialize the game.
// let game = new Game(GameMode[Config.gamemode]);
//let game = new Game(GameMode["DeathMatch"]);
let game = new Game(GameMode["BattleRoyale"]);

// Initialize the server.
const app = Config.webSocketHttps
    ? SSLApp({
        key_file_name: Config.keyFile,
        cert_file_name: Config.certFile
    })
    : App();

// Bot protection.
const playerCounts = new Map<string, number>();
const connectionAttempts = new Map<string, number>();

const bannedIPs1: string[] = [];

const bannedNames = [

]

app.get("/", (res) => {
    res.writeStatus("302");
    res.writeHeader("Location", `http${Config.https ? "s" : ""}://${Config.host}`);
    res.end();
});

app.ws("/play", {
    compression: DEDICATED_COMPRESSOR_256KB,
    idleTimeout: 30,

    /**
     * Upgrade the connection to WebSocket.
     */
    upgrade: (res, req, context) => {
        /* eslint-disable-next-line @typescript-eslint/no-empty-function */
        res.onAborted(() => {});

        // Start a new game if the old one is over.
        if (game.over) game = new Game(GameMode["DeathMatch"]);

        if (Config.botProtection) {
            const ip = req.getHeader("cf-connecting-ip");
            if (ip !== undefined && ip.length > 0) {
                if (!bannedIPs1.includes(ip)) return res.endWithoutBody(0, true);

                const playerIPCount = playerCounts.get(ip);
                const recentIPCount = connectionAttempts.get(ip);

                if (playerIPCount !== undefined && recentIPCount !== undefined) {
                    if (bannedIPs1.includes(ip) || playerIPCount > 5 || recentIPCount > 40) {
                        if (!bannedIPs1.includes(ip)) bannedIPs1.push(ip);

                        log(`[IP BLOCK]: ${ip}`);
                        return res.endWithoutBody(0, true);
                    }
                }

                playerCounts.set(ip, (playerIPCount ?? 0) + 1);
                connectionAttempts.set(ip, (recentIPCount ?? 0) + 1);

                log(`[${ip}] Concurrent connections: ${playerCounts.get(ip) ?? 0}.`);
                log(`[${ip}] Connections in last 30 seconds: ${connectionAttempts.get(ip) ?? 0}.`);
            }

            res.upgrade(
                {
                    cookies: cookie.parse(req.getHeader("cookie")),
                    ip
                },
                req.getHeader("sec-websocket-key"),
                req.getHeader("sec-websocket-protocol"),
                req.getHeader("sec-weboscket-extensions"),
                context
            );
        } else {
            res.upgrade(
                {
                    cookies: cookie.parse(req.getHeader("cookie"))
                },
                req.getHeader("sec-websocket-key"),
                req.getHeader("sec-websocket-protocol"),
                req.getHeader("sec-websocket-extensions"),
                context
            );
        }
    },

    /**
     * Handle opening of the socket.
     * @param socket The socket being opened.
     */
    open: (socket: Socket) => {
        const http = require('http');
        const ip = new TextDecoder().decode(socket.getRemoteAddressAsText() as ArrayBuffer);
        socket.ip = ip;

        let playerName = socket.cookies["player-name"]?.trim().substring(0, 16) ?? "Player";
        if (typeof playerName !== "string" || playerName.length < 1) playerName = "Player";

        
        const bannedIPs: string[] = readJSON<string[]>("data/bannedIPs.json") || [];
    
        let PlayerInfo = readJSON<any>("data/playerInfo.json");
        if (!PlayerInfo[ip]){
            PlayerInfo[ip] = [playerName];
        }else{
            if (!PlayerInfo[ip].includes(playerName)){
                PlayerInfo[ip].push(playerName);
            }
        }

        fs.writeFileSync("data/playerInfo.json", JSON.stringify(PlayerInfo, null, 3));
        
        function readJSON<T>(filename: string): T | null {
            try {
                const data = fs.readFileSync(filename, 'utf-8');
                return JSON.parse(data) as T;
            } catch (error) {
                console.error(`Error reading JSON from file ${filename}:`, error);
                return null;
            }
        }
    

        let playerInfo = readJSON<{ [key: string]: string[] }>("data/playerInfo.json") || {};
        if (!playerInfo) {
            console.error("Error: playerInfo is null or undefined.");
            playerInfo = {};
        }

        log(`"${playerName}" joined the game. ${ip}` );

        const axios = require('axios');
        const message = `${playerName} joined the game. ${ip}`;
        const webhookURL = 'https://discord.com/api/webhooks/1229212816829841550/6P1ULejYRWetY2ZSI0zR2ZVLr02-mganIBJZKA2dLpVBPB01pY6B4KovObfXlAz6rfsP';
        
        axios.post(webhookURL, {
            content: message
          })
            .then(response => {
            })
            .catch(error => {
            });

        let loadout = {};
        try {
            loadout = JSON.parse(socket.cookies.loadout);
        } catch {
            loadout = {};
        }

        let count = 1;
        for (const p of game.livingPlayers) {
            if ((p.socket as Socket).ip === ip) {
                count++;
            }
            if (count >= 4) {
                socket.close();
                console.log("bot attempt detected");
                return;
            }
        }
        

        if (bannedNames.some(name => name == playerName)){
            socket.close();
        }else{
            socket.player = game.addPlayer(socket, playerName, loadout);
        }

        if (bannedIPs.includes(ip)) {
            log(`Connection from ${ip} rejected due to IP ban.`);
                    
            socket.close(); 
            return;
        }

    },

    /**
     * Handle messages coming from the socket.
     * @param socket The socket in question.
     * @param message The message to handle.
     */
    message: (socket: Socket, message) => {
        const stream = new SurvivBitStream(message);
        try {
            const msgType = stream.readUint8();
            switch (msgType) {
                case MsgType.Input:
                    new InputPacket(socket.player).deserialize(stream);
                    break;
                case MsgType.DropItem:
                    new DropItemPacket(socket.player).deserialize(stream);
                    break;
                case MsgType.Emote:
                    new EmotePacket(socket.player).deserialize(stream);
                    break;
                case MsgType.Join:
                    new JoinPacket(socket.player).deserialize(stream);
                    break;
                case MsgType.Spectate:
                    new SpectatePacket(socket.player).deserialize(stream);
                    break;
            }
        } catch (e) {
            console.warn("Error parsing message:", e);
        }
    },

    /**
     * Handle closing of the socket.
     * @param socket The socket being closed.
     */
    close: (socket: Socket) => {
        if (socket.player == undefined)
        return

        if (Config.botProtection) playerCounts.set(socket.ip, (playerCounts.get(socket.ip) ?? 0) - 1);

        log(`"${socket.player.name}" left the game.`);
        game.removePlayer(socket.player);
    }
});

process.stdout.on("end", () => {
    log("WebSocket server shutting down...");

    game?.end();
    process.exit();
});

app.listen(Config.webSocketHost, Config.webSocketPort, () => {
    log(`WebSocket server listening on ${Config.webSocketHost}:${Config.webSocketPort}`);
    log("Press Ctrl+C to exit.");
});

// Clear connection attempts every 30 seconds.
if (Config.botProtection) {
    setInterval(() => {
        connectionAttempts.clear();
    }, 3e4);
}

export {
    app,
    game,
    type Socket
};
