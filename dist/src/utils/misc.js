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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepCopy = exports.readDirectory = exports.getContentType = exports.readPostedJSON = exports.readJSON = exports.log = exports.removeFrom = exports.Emote = exports.DamageRecord = exports.Item = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class Item {
    type;
    count;
    constructor(type, count) {
        this.type = type;
        this.count = count;
    }
}
exports.Item = Item;
class DamageRecord {
    damaged;
    damager;
    bullet;
    constructor(damaged, damager, bullet) {
        this.damaged = damaged;
        this.damager = damager;
        this.bullet = bullet;
    }
}
exports.DamageRecord = DamageRecord;
class Emote {
    playerId;
    position;
    type;
    isPing;
    constructor(playerId, position, type, isPing) {
        this.playerId = playerId;
        this.position = position;
        this.type = type;
        this.isPing = isPing;
    }
}
exports.Emote = Emote;
/**
 * Find and remove an element from an array.
 * @param array The array to iterate over.
 * @param value The value to check for.
 */
function removeFrom(array, value) {
    const index = array.indexOf(value);
    if (index !== -1)
        array.splice(index, 1);
}
exports.removeFrom = removeFrom;
/**
 * Log a message to the console.
 * @param message The content to print.
 */
function log(message) {
    const date = new Date();
    console.log(`[${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString("en-US")}] ${message}`);
}
exports.log = log;
/**
 * Read a JSON file.
 * @param path The path to the JSON file.
 */
const readJSON = (path) => JSON.parse(fs.readFileSync(path, "utf-8"));
exports.readJSON = readJSON;
/**
 * Read the body of a POST request.
 * @link https://github.com/uNetworking/uWebSockets.js/blob/master/examples/JsonPost.js
 * @param res The response from the client.
 * @param cb A callback containing the request body.
 * @param err A callback invoked whenever the request cannot be retrieved.
 */
function readPostedJSON(res, cb, err) {
    let buffer;
    /* Register data cb */
    res.onData((ab, isLast) => {
        const chunk = Buffer.from(ab);
        if (isLast) {
            let json;
            if (buffer) {
                try {
                    // @ts-expect-error JSON.parse can accept a Buffer as an argument
                    json = JSON.parse(Buffer.concat([buffer, chunk]));
                }
                catch (e) {
                    /* res.close calls onAborted */
                    res.close();
                    return;
                }
                cb(json);
            }
            else {
                try {
                    // @ts-expect-error JSON.parse can accept a Buffer as an argument
                    json = JSON.parse(chunk);
                }
                catch (e) {
                    /* res.close calls onAborted */
                    res.close();
                    return;
                }
                cb(json);
            }
        }
        else {
            if (buffer) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            else {
                buffer = Buffer.concat([chunk]);
            }
        }
    });
    /* Register error cb */
    res.onAborted(err);
}
exports.readPostedJSON = readPostedJSON;
/**
 * Get the MIME type of a file.
 * @param file The name or path to the file.
 */
function getContentType(file) {
    // this should be done with a switch
    let contentType = "";
    switch (file.split(".").pop()) {
        case "svg":
            contentType = "image/svg+xml";
            break;
        case "mp3":
            contentType = "audio/mpeg";
            break;
        case "html":
            contentType = "text/html; charset=UTF-8";
            break;
        case "css":
            contentType = "text/css";
            break;
        case "js":
            contentType = "text/javascript";
            break;
        case "png":
            contentType = "image/png";
            break;
        case "ico":
            contentType = "image/vnd.microsoft.icon";
            break;
        case "jpg":
            contentType = "image/jpeg";
            break;
    }
    return contentType;
}
exports.getContentType = getContentType;
/**
 * Recursively read a directory.
 * @param dir The absolute path to the directory.
 * @returns An array representation of the directory's contents.
 */
const readDirectory = (dir) => {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.resolve(dir, file);
        const stat = fs.statSync(filePath);
        if (stat?.isDirectory()) {
            const res = (0, exports.readDirectory)(filePath);
            results = results.concat(res);
        }
        else
            results.push(filePath);
    }
    return results;
};
exports.readDirectory = readDirectory;
/**
 * Perform a deep copy of an object.
 * @param object The object to copy.
 */
function deepCopy(object) {
    return JSON.parse(JSON.stringify(object));
}
exports.deepCopy = deepCopy;
//# sourceMappingURL=misc.js.map