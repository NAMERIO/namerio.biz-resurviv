"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const package_json_1 = require("../package.json");
const uWebSockets_js_1 = require("uWebSockets.js");
const cookie_1 = __importDefault(require("cookie"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const data_1 = require("./utils/data");
const misc_1 = require("./utils/misc");
// Initialize the server.
const app = data_1.Config.webSocketHttps
    ? (0, uWebSockets_js_1.SSLApp)({
        key_file_name: data_1.Config.keyFile,
        cert_file_name: data_1.Config.certFile
    })
    : (0, uWebSockets_js_1.App)();
exports.app = app;
const staticFiles = {};
for (const file of (0, misc_1.readDirectory)(path.resolve(__dirname, "../../public")))
    staticFiles[file.replace("\\", "/")] = fs.readFileSync(file);
app.get("/*", (res, req) => {
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    res.onAborted(() => { });
    const path = req.getUrl() === "/" ? "/index.html" : req.getUrl();
    let file;
    if (data_1.Debug.disableStaticFileCache) {
        try {
            file = fs.readFileSync(`public${path}`);
        }
        catch (e) {
            file = undefined;
        }
    }
    else
        file = staticFiles[path];
    if (file === undefined) {
        res.writeStatus("404 Not Found");
        res.end(`<!DOCTYPE html><html lang="en"><body><pre>404 Not Found: ${req.getUrl()}</pre></body></html>`);
        return;
    }
    res.writeHeader("Content-Type", (0, misc_1.getContentType)(path)).end(file);
});
app.get("/api/site_info", res => {
    res.writeHeader("Content-Type", "application/json");
    res.end(fs.readFileSync(path.resolve(__dirname, "../../json/site_info.json")));
});
app.get("/api/games_modes", res => {
    res.writeHeader("Content-Type", "application/json");
    res.end(JSON.stringify([{ mapName: "main", teamMode: 1 }]));
});
app.get("/api/prestige_battle_modes", res => {
    res.writeHeader("Content-Type", "application/json");
    res.end(fs.readFileSync(path.resolve(__dirname, "../../json/prestige_battle_modes.json")));
});
app.post("/api/user/get_user_prestige", res => {
    res.writeHeader("Content-Type", "application/json");
    res.end("\"0\"");
});
app.post("/api/find_game", res => {
    (0, misc_1.readPostedJSON)(res, (body) => {
        const addr = data_1.Config.useWebSocketDevAddress ? data_1.Config.webSocketDevAddress : (data_1.Config.webSocketRegions[body?.region] ?? data_1.Config.webSocketRegions[data_1.Config.defaultRegion]);
        res.writeHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ res: [{ zone: body.zones[0], gameId: "", useHttps: data_1.Config.https, hosts: [addr], addrs: [addr] }] }));
    }, () => {
        (0, misc_1.log)("/api/find_game: Error retrieving body");
    });
});
app.post("/api/user/profile", (res, req) => {
    const loadout = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../json/profile.json"), "utf-8"));
    const cookies = cookie_1.default.parse(req.getHeader("cookie"));
    try {
        if (cookies.loadout)
            loadout.loadout = JSON.parse(cookies.loadout);
    }
    catch {
        (0, misc_1.log)("/api/user/profile: Player tried to send invalid loadout");
    }
    /**
     * @note JSON.stringify() is slow.
     */
    res.writeHeader("Content-Type", "application/json");
    res.end(JSON.stringify(loadout));
});
app.post("/api/user/loadout", res => {
    (0, misc_1.readPostedJSON)(res, (body) => {
        res.writeHeader("Set-Cookie", cookie_1.default.serialize("loadout", JSON.stringify(body.loadout), { path: "/", domain: data_1.Config.host, maxAge: 2147483647 }));
        res.writeHeader("Content-Type", "application/json");
        res.end(JSON.stringify(body));
    }, () => {
        (0, misc_1.log)("/api/user/loadout: Error retrieving body");
    });
});
app.post("/api/user/load_exclusive_offers", res => {
    res.writeHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, data: [] }));
});
app.post("/api/user/load_previous_offers", res => {
    res.writeHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, offers: {} }));
});
app.post("/api/user/get_pass", res => {
    res.writeHeader("Content-Type", "application/json");
    res.end(fs.readFileSync(path.resolve(__dirname, "../../json/get_pass.json")));
});
let lastDataReceivedTime = Date.now() + 3e4;
let webSocketProcess;
const shutdownHandler = () => {
    (0, misc_1.log)("Shutting down...");
    webSocketProcess.kill("SIGKILL");
    process.exit();
};
process.on("SIGINT", shutdownHandler);
process.on("SIGTERM", shutdownHandler);
/**
 * Create a new game.
 */
const spawnWebSocketProcess = () => {
    webSocketProcess = (0, child_process_1.spawn)("node", ["--enable-source-maps", "dist/src/webSocketServer.js"]);
    webSocketProcess.stdout.on("data", data => {
        lastDataReceivedTime = Date.now();
        process.stdout.write(data);
    });
    webSocketProcess.stderr.on("data", data => process.stderr.write(data));
};
setInterval(() => {
    if (Date.now() - lastDataReceivedTime > 1e4) {
        (0, misc_1.log)("WebSocket process has not sent data in more than 10 seconds. Restarting...");
        lastDataReceivedTime = Date.now() + 3e4;
        webSocketProcess.kill("SIGKILL");
        setTimeout(spawnWebSocketProcess, 1e3);
    }
}, 1e4);
(0, misc_1.log)(`Surviv Reloaded v${package_json_1.version}`);
app.listen(data_1.Config.host, data_1.Config.port, () => {
    (0, misc_1.log)(`HTTP server listening on ${data_1.Config.host}:${data_1.Config.port}`);
    (0, misc_1.log)("WebSocket server is starting...");
    spawnWebSocketProcess();
});
//# sourceMappingURL=server.js.map