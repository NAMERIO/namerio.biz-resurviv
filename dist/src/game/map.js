"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameMap = void 0;
const constants_1 = require("../utils/constants");
const misc_1 = require("../utils/misc");
const data_1 = require("../utils/data");
const math_1 = require("../utils/math");
const obstacle_1 = require("./objects/obstacle");
const structure_1 = require("./objects/structure");
const building_1 = require("./objects/building");
const decal_1 = require("./objects/decal");
const planck_1 = require("planck");
const loot_1 = require("./objects/loot");
const stair_1 = require("./stair");
// type CircleBound = ObjectBounds & { type: CollisionType.Circle };
// Potential naming collision with the native Map class
//renamed from Map to GameMap to avoid collisions
class GameMap {
    name;
    seed;
    game;
    width;
    height;
    shoreInset;
    grassInset;
    rivers;
    places;
    groundPatches;
    constructor(game, mapId) {
        const mapStartTime = Date.now();
        this.name = mapId;
        this.seed = (0, math_1.random)(0, 2147483647);
        this.game = game;
        const mapInfo = data_1.Maps[mapId];
        this.width = mapInfo.width;
        this.height = mapInfo.height;
        this.shoreInset = 48;
        this.grassInset = 18;
        // Create world boundaries
        this.createWorldBoundary(this.width / 2, 0, this.width / 2, 0);
        this.createWorldBoundary(0, this.height / 2, 0, this.height / 2);
        this.createWorldBoundary(this.width / 2, this.height, this.width / 2, 0);
        this.createWorldBoundary(this.width, this.height / 2, 0, this.height / 2);
        // TODO Better river generation
        this.rivers = [];
        if (!data_1.Debug.disableMapGeneration) {
            let x = 0;
            let y = 500;
            const points = [];
            while (x < 700) {
                x += 20;
                y -= 5 + (0, math_1.random)(-8, 8);
                points.push((0, planck_1.Vec2)(x, y));
                // Crossing bunker
                // River docks
                // Fisherman's shacks
                // Large bridges
                // Smaller river
                if (x === 440) {
                    let x2 = 500;
                    let y2 = y - 32;
                    const points2 = [];
                    for (let steps = 0; y2 < 700; steps++) {
                        x2 += 5 + (0, math_1.random)(-8, 8);
                        y2 += 20;
                        points2.push((0, planck_1.Vec2)(x2, y2));
                        // Medium bridges
                        if (steps === 5 || steps === 12)
                            this.genBuilding("bridge_md_01", data_1.Objects.bridge_md_01, (0, planck_1.Vec2)(x2, y2), 0, 0);
                        else if (y2 < 660) {
                            if ((0, math_1.randomBoolean)())
                                this.genRiverObstacle((0, planck_1.Vec2)(x2, y2), 5, "stone_03");
                            if ((0, math_1.randomBoolean)())
                                this.genRiverObstacle((0, planck_1.Vec2)(x2, y2), 5, "bush_04");
                        }
                    }
                    this.rivers.push(new River(8, 0, points2));
                }
            }
            this.rivers.push(new River(16, 0, points));
            // Generate river obstacles
            const riverIndex = (0, math_1.random)(0, this.rivers.length - 1);
            for (let i = 0; i < this.rivers.length; i++) {
                const river = this.rivers[i];
                let pointIndex;
                if (i === riverIndex) {
                    pointIndex = (0, math_1.random)(0, river.points.length - 1);
                }
                for (let i2 = 0; i2 < river.points.length; i2++) {
                    const { x, y } = river.points[i2];
                    if (i2 === pointIndex) {
                        this.genRiverObstacle((0, planck_1.Vec2)(x, y), 15, "chest_03"); // River chest
                    }
                    if (x > 20 && x < 700) {
                        // 1 in 3 chance of obstacle not generating at a river point
                        if (!((0, math_1.random)(1, 3) === 1))
                            this.genRiverObstacle((0, planck_1.Vec2)(x, y), 15, "stone_03");
                        if (!((0, math_1.random)(1, 3) === 1))
                            this.genRiverObstacle((0, planck_1.Vec2)(x, y), 15, "bush_04");
                    }
                }
            }
        }
        this.places = [];
        for (const place of mapInfo.places) {
            this.places.push(new Place(place.name, (0, planck_1.Vec2)(place.x, place.y)));
        }
        this.groundPatches = [];
        if (!data_1.Debug.disableMapGeneration) {
            // Docks
            this.genOnShore(constants_1.ObjectKind.Building, "warehouse_complex_01", 0, 72, 0, 1);
            // Small shore buldiong thing (idk)
            this.genOnShore(constants_1.ObjectKind.Building, "shack_03b", 1, 57, 1);
            this.genOnShore(constants_1.ObjectKind.Building, "shack_03a", 1, 57, 1);
            // Conch bunker
            // Huts
            this.genOnShore(constants_1.ObjectKind.Building, "hut_01", 1, 27, 1);
            this.genOnShore(constants_1.ObjectKind.Building, "hut_02", 1, 27, 1);
            this.genOnShore(constants_1.ObjectKind.Building, "hut_03", 1, 27, 1);
            // Barrels & crates
            // TODO Allow barrels and crates to spawn on the beach naturally
            this.genOnShore(constants_1.ObjectKind.Obstacle, "crate_01", 3, 57, 4);
            this.genOnShore(constants_1.ObjectKind.Obstacle, "barrel_01", 9, 57, 4);
            // Treasure chest
            this.genOnShore(constants_1.ObjectKind.Obstacle, "chest_01", 1, 57, 4);
            // Loose loot
            for (let i = 0; i < 16; i++) {
                (0, loot_1.generateLooseLootFromArray)(this.game, [{ tier: "tier_world", min: 1, max: 1 }], 
                //! ?????
                this.getRandomPositionFor(constants_1.ObjectKind.Loot, undefined, 0, 1), 0);
            }
            for (const type in mapInfo.objects) {
                const data = data_1.Objects[type];
                const count = mapInfo.objects[type];
                switch (data.type) {
                    case "obstacle":
                        this.genObstacles(count, type, data);
                        break;
                    case "building":
                        this.genBuildings(count, type, data);
                        break;
                    case "structure":
                        this.genStructures(count, type, data);
                        break;
                }
            }
        }
        else {
            // Building/obstacle debug code goes here
            /* eslint-disable no-new */
            new loot_1.Loot(this.game, "762mm", (0, planck_1.Vec2)(450, 150), 0, 180);
            new loot_1.Loot(this.game, "2xscope", (0, planck_1.Vec2)(450, 150), 0, 1);
            new loot_1.Loot(this.game, "m870", (0, planck_1.Vec2)(450, 150), 0, 1);
            new loot_1.Loot(this.game, "m1911", (0, planck_1.Vec2)(450, 150), 0, 1);
            new loot_1.Loot(this.game, "m870", (0, planck_1.Vec2)(450, 150), 0, 1);
            /* eslint-enable-next-line no-new */
        }
        (0, misc_1.log)(`Map generation took ${Date.now() - mapStartTime}ms`);
        // Calculate visible objects
        const visibleObjectsStartTime = Date.now();
        const supportedZoomLevels = [28, 36, 48, 32, 40, 48];
        if (this.game.has8x)
            supportedZoomLevels.push(64, 68);
        if (this.game.has15x)
            supportedZoomLevels.push(88, 104);
        for (const zoomLevel of supportedZoomLevels) {
            this.game.visibleObjects[zoomLevel] = {};
            const xCullDist = zoomLevel * 1.55;
            const yCullDist = zoomLevel * 1.25;
            for (let x = 0; x <= this.width / 10; x++) {
                this.game.visibleObjects[zoomLevel][x * 10] = {};
                for (let y = 0; y <= this.height / 10; y++) {
                    const visibleObjects = new Set();
                    const minX = (x * 10) - xCullDist;
                    const minY = (y * 10) - yCullDist;
                    const maxX = (x * 10) + xCullDist;
                    const maxY = (y * 10) + yCullDist;
                    const min = (0, planck_1.Vec2)(minX, minY);
                    const max = (0, planck_1.Vec2)(maxX, maxY);
                    for (const object of this.game.staticObjects) {
                        let isVisible = false;
                        if (object.mapObstacleBounds) {
                            for (const bounds of object.mapObstacleBounds) {
                                if ((0, math_1.rectRectCollision)(min, max, bounds.min, bounds.max)) {
                                    isVisible = true;
                                    break;
                                }
                            }
                        }
                        else {
                            isVisible = object.position.x > minX &&
                                object.position.x < maxX &&
                                object.position.y > minY &&
                                object.position.y < maxY;
                        }
                        if (isVisible)
                            visibleObjects.add(object);
                    }
                    this.game.visibleObjects[zoomLevel][x * 10][y * 10] = visibleObjects;
                }
            }
        }
        (0, misc_1.log)(`Calculating visible objects took ${Date.now() - visibleObjectsStartTime}ms`);
    }
    obstacleTest(type, position, orientation = 0, scale = 1) {
        this.genObstacle(type, position, 0, orientation, scale, data_1.Objects[type]);
    }
    genStructures(count, type, building) {
        for (let i = 0; i < count; i++)
            this.genStructure(type, building);
    }
    genStructure(typeString, structureData, setPosition, setOrientation) {
        // TODO proper structure bounds, structures are being deleted from the client when they should still be visible
        const orientation = setOrientation ?? (0, math_1.random)(0, 3);
        const position = setPosition ?? this.getRandomPositionFor(constants_1.ObjectKind.Structure, structureData, orientation, 1);
        const layerObjs = [];
        if (structureData.layers != null) {
            for (let layerId = 0, length = structureData.layers.length; layerId < length; layerId++) {
                const layerObj = structureData.layers[layerId];
                const layerType = layerObj.type;
                const layer = data_1.Objects[layerType];
                let layerOrientation;
                if (layerObj.inheritOri === false)
                    layerOrientation = layerObj.ori;
                else
                    layerOrientation = (0, math_1.addOrientations)(layerObj.ori, orientation);
                const layerPosition = (0, math_1.addAdjust)(position, (0, planck_1.Vec2)(layerObj.pos), orientation);
                if (layer.type === "structure") {
                    const object = this.genStructure(layerType, layer, layerPosition, layerOrientation);
                    layerObjs.push(object);
                }
                else if (layer.type === "building") {
                    const object = this.genBuilding(layerType, layer, layerPosition, layerOrientation, layerId);
                    layerObjs.push(object);
                }
                else {
                    // console.warn(`Unsupported object type: ${layer.type}`);
                }
            }
        }
        const structure = new structure_1.Structure(this.game, typeString, position, orientation, layerObjs.map(object => object.id));
        this.game.staticObjects.add(structure);
        for (const object of layerObjs) {
            if (object instanceof building_1.Building)
                object.parentStructure = structure;
        }
        if ("stairs" in structureData && Array.isArray(structureData.stairs)) {
            for (const stairData of structureData.stairs) {
                if (!stairData.lootOnly)
                    this.game.stairs.add(new stair_1.Stair(position, orientation ?? 0, stairData));
            }
        }
        return structure;
    }
    genBuildings(count, type, building) {
        for (let i = 0; i < count; i++)
            this.genBuilding(type, building);
    }
    buildingTest(type, orientation) {
        this.genBuilding(type, data_1.Objects[type], (0, planck_1.Vec2)(450, 150), orientation, undefined, true);
    }
    genBuilding(typeString, buildingData, setPosition, setOrientation, setLayer, debug = false) {
        const orientation = setOrientation ?? (typeString.startsWith("cache_") ? 0 : (0, math_1.random)(0, 3));
        const layer = setLayer ?? 0;
        const position = setPosition ?? this.getRandomPositionFor(constants_1.ObjectKind.Building, buildingData, orientation, 1);
        const building = new building_1.Building(this.game, typeString, position, setLayer ?? 0, orientation, buildingData.map?.display ?? false, buildingData);
        for (const mapObject of buildingData.mapObjects ?? []) {
            const partType = mapObject.type;
            if (!partType || partType === "") {
                // console.warn(`${type}: Missing object at ${mapObject.position.x}, ${mapObject.position.y}`);
                continue;
            }
            const part = data_1.Objects[partType];
            let partOrientation;
            if (mapObject.inheritOri === false)
                partOrientation = mapObject.ori;
            else
                partOrientation = (0, math_1.addOrientations)(mapObject.ori, orientation);
            const partPosition = (0, math_1.addAdjust)(position, (0, planck_1.Vec2)(mapObject.pos), orientation);
            switch (part.type) {
                case "structure":
                    this.genStructure(partType, part, partPosition, partOrientation);
                    break;
                case "building":
                    this.genBuilding(partType, part, partPosition, partOrientation, layer);
                    break;
                case "obstacle":
                    //ensures that mosin trees do not randomly spawn
                    if (partType == "tree_03") {
                        break;
                    }
                    this.genObstacle(partType, partPosition, layer, partOrientation, mapObject.scale, part, building, mapObject.bunkerWall ?? false, mapObject.puzzlePiece);
                    break;
                case "random": {
                    const items = Object.keys(part.weights);
                    const weights = Object.values(part.weights);
                    const randType = (0, math_1.weightedRandom)(items, weights);
                    if (randType !== "nothing") {
                        const data = data_1.Objects[randType];
                        switch (data.type) {
                            case "obstacle":
                                this.genObstacle(randType, partPosition, layer, partOrientation, mapObject.scale, data, building);
                                break;
                            case "loot_spawner":
                                (0, loot_1.generateLooseLootFromArray)(this.game, data.loot, partPosition, layer);
                                break;
                            case "building":
                                this.genBuilding(randType, data, partPosition, partOrientation, layer);
                                break;
                        }
                    }
                    break;
                }
                case "loot_spawner":
                    (0, loot_1.generateLooseLootFromArray)(this.game, part.loot, partPosition, layer);
                    break;
                case "decal":
                    this.game.staticObjects.add(new decal_1.Decal(partType, this.game, partPosition, layer, partOrientation, mapObject.scale));
                    break;
                // No such entry exists
                // case "ignored":
                // Ignored
                // break;
            }
        }
        if (buildingData.mapGroundPatches != null) {
            for (const groundPatch of buildingData.mapGroundPatches) {
                this.groundPatches.push(new GroundPatch(
                //! all of these non-null assertions are unsafe
                (0, math_1.addAdjust)(position, (0, planck_1.Vec2)(groundPatch.bound.min), orientation), (0, math_1.addAdjust)(position, (0, planck_1.Vec2)(groundPatch.bound.max), orientation), groundPatch.color, groundPatch.roughness, groundPatch.offsetDist, groundPatch.order, groundPatch.useAsMapShape ?? true));
            }
        }
        if (debug) {
            for (const bounds of building.mapObstacleBounds) {
                this.placeDebugMarker(bounds.min);
                this.placeDebugMarker(bounds.max);
                this.placeDebugMarker((0, planck_1.Vec2)(bounds.min.x, bounds.max.y));
                this.placeDebugMarker((0, planck_1.Vec2)(bounds.max.x, bounds.min.y));
            }
        }
        this.game.staticObjects.add(building);
        return building;
    }
    placeDebugMarker(position) {
        this.game.staticObjects.add(new obstacle_1.Obstacle(this.game, "house_column_1", position, 0, 0, 0.125, data_1.Objects.house_column_1));
    }
    genRiverObstacle(point, riverWidth, typeString) {
        // hack This type-cast is unsafe!
        const obstacleData = data_1.Objects[typeString];
        const scale = (0, math_1.randomFloat)(obstacleData.scale.createMin, obstacleData.scale.createMax);
        const position = this.getRandomPositionFor(constants_1.ObjectKind.Obstacle, obstacleData, 0, scale, () => {
            return (0, math_1.randomPointInsideCircle)((0, planck_1.Vec2)(point.x, point.y), riverWidth);
        }, true);
        this.genObstacle(typeString, position, 0, 0, scale, obstacleData);
    }
    genObstacle(typeString, position, layer, orientation, scale, obstacleData, parentBuilding, bunkerWall = false, puzzlePice) {
        const obstacle = new obstacle_1.Obstacle(this.game, typeString, position, layer, orientation, scale, obstacleData, parentBuilding, bunkerWall, puzzlePice);
        if (obstacle.door?.slideToOpen)
            this.game.dynamicObjects.add(obstacle);
        else
            this.game.staticObjects.add(obstacle);
        return obstacle;
    }
    genObstacles(count, typeString, obstacleData) {
        for (let i = 0; i < count; i++) {
            const scale = (0, math_1.randomFloat)(obstacleData.scale.createMin, obstacleData.scale.createMax);
            this.genObstacle(typeString, this.getRandomPositionFor(constants_1.ObjectKind.Obstacle, obstacleData, 0, scale), 0, 0, scale, obstacleData);
        }
    }
    genOnShore(kind, typeString, count, shoreDist, width, orientationOffset = 0, shoreEdgeDist = shoreDist) {
        for (let i = 0; i < count; i++) {
            const data = data_1.Objects[typeString];
            const orientation = (0, math_1.random)(0, 3);
            const position = this.getPositionOnShore(kind, data, (0, math_1.addOrientations)(orientation, orientationOffset), 1, shoreDist, width, shoreEdgeDist);
            if (kind === constants_1.ObjectKind.Building) {
                this.genBuilding(typeString, data, position, orientation);
            }
            else if (kind === constants_1.ObjectKind.Obstacle) {
                this.genObstacle(typeString, position, 0, (kind === constants_1.ObjectKind.Obstacle) ? 0 : orientation, (0, math_1.random)(data.scale.createMin, data.scale.createMax), data);
            }
            else if (kind === constants_1.ObjectKind.Structure) {
                this.genStructure(typeString, data, position, orientation);
            }
        }
    }
    getPositionOnShore(kind, data, orientation, scale, shoreDist, width, shoreEdgeDist = shoreDist) {
        return this.getRandomPositionFor(kind, data, orientation, scale, () => {
            let min, max;
            switch (orientation) {
                case 0:
                    min = (0, planck_1.Vec2)(shoreDist - width, this.height - shoreDist - width);
                    max = (0, planck_1.Vec2)(this.width - shoreDist + width, this.height - shoreDist + width);
                    break;
                case 1:
                    min = (0, planck_1.Vec2)(shoreDist - width, this.height - shoreDist - width);
                    max = (0, planck_1.Vec2)(shoreDist + width, shoreDist + width);
                    break;
                case 2:
                    min = (0, planck_1.Vec2)(shoreDist - width, shoreDist - width);
                    max = (0, planck_1.Vec2)(this.width - shoreDist + width, shoreDist + width);
                    break;
                case 3:
                    min = (0, planck_1.Vec2)(this.width - shoreDist - width, this.height - shoreDist - width);
                    max = (0, planck_1.Vec2)(this.width - shoreDist + width, shoreDist + width);
                    break;
            }
            return (0, math_1.randomVec)(min.x, max.x, min.y, max.y);
        });
    }
    getRandomPositionFor(kind, object, orientation = 0, scale = 1, getPosition, ignoreRivers, 
    /**
     * this is only passed in when getting a random spawn position for a player
     * it's used in battleroyale since teammates are supposed to spawn next to each other
     */
    playerGroupId) {
        const isBuilding = kind === constants_1.ObjectKind.Building || kind === constants_1.ObjectKind.Structure;
        const thisBounds = [];
        switch (kind) {
            case constants_1.ObjectKind.Obstacle:
                {
                    //! unsafe
                    const bound = (0, misc_1.deepCopy)(object.collision);
                    //! unsafe
                    if (object.collision.type === constants_1.CollisionType.Rectangle) {
                        // @ts-expect-error; hack
                        bound.originalMin = (0, planck_1.Vec2)(bound.min);
                        // @ts-expect-error; hack
                        bound.originalMax = (0, planck_1.Vec2)(bound.max);
                    }
                    else {
                        // @ts-expect-error; hack
                        bound.rad *= scale;
                    }
                    thisBounds.push(bound);
                    break;
                }
            case constants_1.ObjectKind.Player:
                //! unsafe
                // @ts-expect-error; hack
                thisBounds.push({ type: constants_1.CollisionType.Circle, rad: 1 });
                break;
            case constants_1.ObjectKind.Loot:
                //! unsafe
                // @ts-expect-error; hack
                thisBounds.push({ type: constants_1.CollisionType.Circle, rad: 5 });
                break;
            case constants_1.ObjectKind.Building:
                thisBounds.push(...this.getBoundsForBuilding(object));
                break;
            case constants_1.ObjectKind.Structure:
                thisBounds.push(...this.getBoundsForStructure(object));
                break;
        }
        if (thisBounds.length === 0) {
            throw new Error("Missing bounds data");
        }
        if (getPosition == null) {
            const minEdgeDist = isBuilding ? 125 : 65;
            getPosition = () => {
                return (0, math_1.randomVec)(minEdgeDist, this.width - minEdgeDist, minEdgeDist, this.height - minEdgeDist);
            };
        }
        //REMOVE
        let foundPosition = false;
        let thisPos;
        let attempts = 0;
        while (!foundPosition && attempts <= 200) {
            attempts++;
            if (attempts >= 200) {
                console.warn("[WARNING] Maximum spawn attempts exceeded for: ", object);
            }
            thisPos = getPosition();
            let shouldContinue = false;
            if (!ignoreRivers) {
                for (const river of this.rivers) {
                    const minRiverDist = isBuilding
                        ? river.width * 5
                        : river.width * 2.5;
                    for (const point of river.points) {
                        if ((0, math_1.distanceBetween)(thisPos, point) < minRiverDist) {
                            shouldContinue = true;
                            break;
                        }
                    }
                    if (shouldContinue)
                        break;
                }
            }
            if (shouldContinue)
                continue;
            for (const thisBound of thisBounds) {
                if (thisBound.type === constants_1.CollisionType.Rectangle) {
                    const newBound = (0, math_1.rotateRect)(thisPos, thisBound.originalMin, thisBound.originalMax, scale, orientation);
                    thisBound.min = newBound.min;
                    thisBound.max = newBound.max;
                }
                if (kind == constants_1.ObjectKind.Player) {
                    // prevents players from spawning either on top of each other or very close
                    if (this.game.gamemode == constants_1.GameMode.DeathMatch) {
                        for (const p of this.game.livingPlayers) {
                            if ((0, math_1.distanceBetween)(thisPos, p.position) < 64) {
                                shouldContinue = true;
                                break;
                            }
                        }
                    }
                    else if (this.game.gamemode == constants_1.GameMode.BattleRoyale) {
                        if (data_1.Config.skinsAreTeam == false) {
                            for (const p of this.game.livingPlayers) {
                                if ((0, math_1.distanceBetween)(thisPos, p.position) < 64) {
                                    shouldContinue = true;
                                    break;
                                }
                            }
                        }
                        else {
                            let randomTeammate;
                            for (const p of this.game.livingPlayers) {
                                if (p.loadout.outfit == playerGroupId) {
                                    randomTeammate = p;
                                    break;
                                }
                            }
                            if (randomTeammate == undefined) {
                                for (const p of this.game.livingPlayers) {
                                    if ((0, math_1.distanceBetween)(thisPos, p.position) < 64) {
                                        shouldContinue = true;
                                        break;
                                    }
                                }
                            }
                            else {
                                thisPos = (0, math_1.randomPointInsideCircle)(randomTeammate.position, 10);
                            }
                        }
                    }
                }
                for (const that of this.game.staticObjects) {
                    if (that instanceof building_1.Building) {
                        // obstacles and players should still spawn on top of bunkers
                        if ((kind === constants_1.ObjectKind.Obstacle || kind === constants_1.ObjectKind.Player) && that.layer === 1)
                            continue;
                        for (const thatBound of that.mapObstacleBounds) {
                            if (thisBound.type === constants_1.CollisionType.Circle) {
                                if ((0, math_1.rectCollision)(thatBound.min, thatBound.max, thisPos, thisBound.rad)) {
                                    shouldContinue = true;
                                }
                            }
                            else if (thisBound.type === constants_1.CollisionType.Rectangle) {
                                if ((0, math_1.rectRectCollision)(thatBound.min, thatBound.max, thisBound.min, thisBound.max)) {
                                    shouldContinue = true;
                                }
                            }
                        }
                    }
                    else if (that instanceof obstacle_1.Obstacle) {
                        if (thisBound.type === constants_1.CollisionType.Circle) {
                            if (that.collision.type === constants_1.CollisionType.Circle) {
                                if ((0, math_1.circleCollision)(that.position, that.collision.rad, thisPos, thisBound.rad)) {
                                    shouldContinue = true;
                                }
                            }
                            else if (that.collision.type === constants_1.CollisionType.Rectangle) {
                                if ((0, math_1.rectCollision)(that.collision.min, that.collision.max, thisPos, thisBound.rad)) {
                                    shouldContinue = true;
                                }
                            }
                        }
                        else if (thisBound.type === constants_1.CollisionType.Rectangle) {
                            if (that.collision.type === constants_1.CollisionType.Circle) {
                                if ((0, math_1.rectCollision)(thisBound.min, thisBound.max, that.position, that.collision.rad)) {
                                    shouldContinue = true;
                                }
                            }
                            else if (that.collision.type === constants_1.CollisionType.Rectangle) {
                                if ((0, math_1.rectRectCollision)(that.collision.min, that.collision.max, thisBound.min, thisBound.max)) {
                                    shouldContinue = true;
                                }
                            }
                        }
                    }
                    if (shouldContinue)
                        break;
                }
                if (shouldContinue)
                    break;
            }
            if (shouldContinue)
                continue;
            foundPosition = true;
        }
        // This returns the spawn position of the last spawned object… why?
        return thisPos;
    }
    getBoundsForBuilding(building, position = (0, planck_1.Vec2)(0, 0), orientation = 0) {
        const bounds = [];
        if (building.mapObstacleBounds && building.mapObstacleBounds.length > 0) {
            for (const obstacleBound of building.mapObstacleBounds) {
                const bound = (0, math_1.rotateRect)(position, (0, planck_1.Vec2)(obstacleBound.min), (0, planck_1.Vec2)(obstacleBound.max), 1, orientation);
                bound.originalMin = bound.min;
                bound.originalMax = bound.max;
                bound.type = constants_1.CollisionType.Rectangle;
                bounds.push(bound);
            }
        }
        else if (building.ceiling.zoomRegions && building.ceiling.zoomRegions.length > 0) {
            for (const zoomRegion of building.ceiling.zoomRegions) {
                //! unsafe
                const rect = zoomRegion.zoomIn ? zoomRegion.zoomIn : zoomRegion.zoomOut;
                //! unsafe
                const bound = (0, math_1.rotateRect)(position, (0, planck_1.Vec2)(rect.min), (0, planck_1.Vec2)(rect.max), 1, orientation);
                bound.originalMin = bound.min;
                bound.originalMax = bound.max;
                bound.type = constants_1.CollisionType.Rectangle;
                bounds.push(bound);
            }
        }
        for (const object of building.mapObjects) {
            const objectType = data_1.Objects[object.type]?.type;
            if (objectType === "building") {
                bounds.push(...this.getBoundsForBuilding(data_1.Objects[object.type], (0, planck_1.Vec2)(object.pos), object.ori));
            }
            else if (objectType === "structure") {
                bounds.push(...this.getBoundsForStructure(data_1.Objects[object.type], (0, planck_1.Vec2)(object.pos), object.ori));
            }
        }
        return bounds;
    }
    getBoundsForStructure(structure, position = (0, planck_1.Vec2)(0, 0), orientation = 0) {
        const bounds = [];
        for (const building of structure.layers ?? []) {
            bounds.push(...this.getBoundsForBuilding(data_1.Objects[building.type], position, orientation));
        }
        return bounds;
    }
    createWorldBoundary(x, y, width, height) {
        const boundary = this.game.world.createBody({
            type: "static",
            position: (0, planck_1.Vec2)(x, y)
        });
        boundary.createFixture({
            shape: (0, planck_1.Box)(width, height),
            userData: {
                kind: constants_1.ObjectKind.Obstacle,
                layer: 0,
                isPlayer: false,
                isObstacle: true,
                isBullet: false,
                isLoot: false,
                collidesWith: {
                    player: true,
                    obstacle: false,
                    bullet: true,
                    loot: false,
                    projectile: true
                }
            }
        });
    }
}
exports.GameMap = GameMap;
class River {
    width;
    looped;
    points;
    constructor(width, looped, points) {
        this.width = width;
        this.looped = looped;
        this.points = points;
    }
}
class Place {
    name;
    position;
    constructor(name, pos) {
        this.name = name;
        this.position = pos;
    }
}
class GroundPatch {
    min;
    max;
    color;
    roughness;
    offsetDist;
    order;
    useAsMapShape;
    constructor(min, max, color, roughness, offsetDist, order, useAsMapShape) {
        this.min = min; // vector
        this.max = max; // vector
        this.color = color; // uint32
        this.roughness = roughness; // float32
        this.offsetDist = offsetDist; // float32
        this.order = order; // 7-bit integer
        this.useAsMapShape = useAsMapShape; // boolean (1 bit)
    }
}
//# sourceMappingURL=map.js.map