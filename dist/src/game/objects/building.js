"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Building = void 0;
const constants_1 = require("../../utils/constants");
const math_1 = require("../../utils/math");
const gameObject_1 = require("../gameObject");
const planck_1 = require("planck");
class Building extends gameObject_1.GameObject {
    showOnMap;
    occupied = false;
    hasPuzzle = false;
    hasPrintedCoordsToConsole = false;
    hasAddedDebugMarkers = false;
    minPos;
    maxPos;
    zoomRadius = 28;
    data;
    puzzle;
    ceiling = {
        destructible: false,
        destroyed: false,
        wallsToDestroy: 0,
        damageable: false,
        damaged: false,
        obstaclesToDestroy: 0
    };
    mapObstacleBounds = [];
    zoomRegions = [];
    doors = [];
    puzzlePieces = [];
    parentStructure;
    constructor(game, typeString, position, layer, orientation, showOnMap, data) {
        super(game, typeString, position, layer, orientation);
        this.kind = constants_1.ObjectKind.Building;
        this.data = data;
        this.showOnMap = showOnMap;
        for (const zoomRegion of data.ceiling.zoomRegions) {
            if (zoomRegion.zoomIn) {
                //! unsafe
                const rect = (0, math_1.rotateRect)(this.position, (0, planck_1.Vec2)(zoomRegion.zoomIn.min), (0, planck_1.Vec2)(zoomRegion.zoomIn.max), 1, this.orientation);
                rect.zoom = zoomRegion.zoom;
                this.zoomRegions.push(rect);
            }
        }
        if (data.ceiling.destroy != null) {
            this.ceiling.destructible = true;
            //! unsafe
            this.ceiling.wallsToDestroy = data.ceiling.destroy.wallCount;
        }
        if (data.ceiling.damage != null) {
            this.ceiling.damageable = true;
            this.ceiling.obstaclesToDestroy = data.ceiling.damage.obstacleCount;
        }
        if (data.puzzle) {
            this.hasPuzzle = true;
            this.puzzle = {
                name: data.puzzle.name,
                completeUseType: data.puzzle.completeUseType,
                completeOffDelay: data.puzzle.completeOffDelay,
                completeUseDelay: data.puzzle.completeUseDelay,
                errorResetDelay: data.puzzle.errorResetDelay,
                pieceResetDelay: data.puzzle.pieceResetDelay,
                order: data.puzzle.order,
                inputOrder: [],
                solved: false,
                errorSeq: 0,
                resetTimeoutId: 0
            };
        }
        if (data.mapObstacleBounds?.length) {
            for (const bounds of data.mapObstacleBounds) {
                this.mapObstacleBounds.push((0, math_1.rotateRect)(position, (0, planck_1.Vec2)(bounds.min), (0, planck_1.Vec2)(bounds.max), 1, this.orientation));
            }
        }
        else if (data.ceiling && data.ceiling.zoomRegions.length > 0) {
            // use the zoom regions as a fallback
            for (const zoomRegion of data.ceiling.zoomRegions) {
                //! unsafe
                const rect = zoomRegion.zoomIn ? zoomRegion.zoomIn : zoomRegion.zoomOut;
                this.mapObstacleBounds.push((0, math_1.rotateRect)(position, 
                //! unsafe
                (0, planck_1.Vec2)(rect.min), 
                //! unsafe
                (0, planck_1.Vec2)(rect.max), 1, this.orientation));
            }
        }
        else {
            console.warn(`No obstacle bounds specified for building: ${typeString}`);
        }
    }
    serializePartial(stream) {
        stream.writeBoolean(this.ceiling.destroyed);
        stream.writeBoolean(this.occupied);
        stream.writeBoolean(this.ceiling.damaged);
        stream.writeBoolean(this.hasPuzzle);
        if (this.hasPuzzle) {
            stream.writeBoolean(this.puzzle.solved);
            stream.writeBits(this.puzzle.errorSeq, 7);
        }
        stream.writeBits(0, 4); // Padding
    }
    serializeFull(stream) {
        stream.writeVec(this.position, 0, 0, 1024, 1024, 16);
        stream.writeMapType(this.typeId);
        stream.writeBits(this.orientation, 2);
        stream.writeBits(this.layer, 2);
    }
    onObstacleDestroyed(obstacle) {
        const ceiling = this.ceiling;
        if (ceiling.destructible && obstacle.isWall && !ceiling.destroyed) {
            ceiling.wallsToDestroy--;
            if (ceiling.wallsToDestroy <= 0) {
                ceiling.destroyed = true;
                this.game.partialDirtyObjects.add(this);
                this.game.updateObjects = true;
            }
        }
        if (ceiling.damageable && obstacle.damageCeiling && !ceiling.damaged) {
            ceiling.obstaclesToDestroy--;
            if (ceiling.obstaclesToDestroy-- <= 0) {
                ceiling.damaged = true;
                this.game.partialDirtyObjects.add(this);
                this.game.updateObjects = true;
            }
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    damage(amount, source) { }
    playerIsOnZoomArea(player) {
        if (this.ceiling.destroyed || !(0, math_1.sameLayer)(this.layer, player.layer))
            return 0;
        for (const zoomRegion of this.zoomRegions) {
            if (zoomRegion.min) {
                if ((0, math_1.rectCollision)(zoomRegion.min, zoomRegion.max, player.position, 1)) {
                    return zoomRegion.zoom ?? constants_1.Constants.scopeZoomRadius[player.isMobile ? "mobile" : "desktop"]["1xscope"];
                }
            }
        }
        return 0;
    }
    puzzlePieceToggled(piece) {
        this.puzzle.inputOrder.push(piece.puzzlePiece);
        if (this.puzzle.resetTimeoutId)
            clearTimeout(this.puzzle.resetTimeoutId);
        // hack to compare two arrays :boffy:
        if (JSON.stringify(this.puzzle.inputOrder) === JSON.stringify(this.puzzle.order)) {
            for (const door of this.doors) {
                if (door.typeString === this.puzzle.completeUseType) {
                    setTimeout(() => {
                        door.toggleDoor();
                    }, this.puzzle.completeUseDelay * 1000);
                }
            }
            this.puzzle.solved = true;
            if (this.parentStructure) {
                this.parentStructure.altSound = true;
                this.game.fullDirtyObjects.add(this.parentStructure);
            }
            setTimeout(this.resetPuzzle.bind(this), this.puzzle.completeOffDelay * 1000);
            this.game.partialDirtyObjects.add(this);
        }
        else if (this.puzzle.inputOrder.length >= this.puzzle.order.length) {
            this.puzzle.errorSeq++;
            this.puzzle.errorSeq %= 2;
            this.game.partialDirtyObjects.add(this);
            this.puzzle.resetTimeoutId = setTimeout(this.resetPuzzle.bind(this), this.puzzle.errorResetDelay * 1000);
        }
        else {
            this.puzzle.resetTimeoutId = setTimeout(() => {
                this.puzzle.errorSeq++;
                this.puzzle.errorSeq %= 2;
                this.game.partialDirtyObjects.add(this);
                setTimeout(this.resetPuzzle.bind(this), this.puzzle.errorResetDelay * 1000, this);
            }, this.puzzle.pieceResetDelay * 1000);
        }
    }
    resetPuzzle() {
        this.puzzle.inputOrder = [];
        for (const piece of this.puzzlePieces) {
            if (piece.isButton) {
                piece.button.canUse = !this.puzzle.solved;
                piece.interactable = piece.button.canUse;
                piece.button.onOff = false;
                this.game.fullDirtyObjects.add(piece);
            }
        }
        this.game.partialDirtyObjects.add(this);
    }
}
exports.Building = Building;
//# sourceMappingURL=building.js.map