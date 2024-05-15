"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameObject = void 0;
const data_1 = require("../utils/data");
class GameObject {
    // For interop with subclasses
    isPlayer;
    isObstacle;
    isBullet;
    isLoot;
    isProjectile;
    id;
    typeString;
    typeId;
    _position;
    layer;
    orientation;
    scale = 1;
    dead = false;
    showOnMap = false;
    interactable = false;
    interactionRad = 0;
    damageable = false;
    game;
    body;
    constructor(game, typeString, position, layer, orientation) {
        this.id = game.nextObjectId;
        this.typeString = typeString;
        if (this.typeString)
            this.typeId = data_1.TypeToId[typeString];
        this._position = position;
        this.layer = layer;
        this.orientation = orientation ?? 0;
        this.game = game;
    }
    get position() {
        return this._position;
    }
}
exports.GameObject = GameObject;
//# sourceMappingURL=gameObject.js.map