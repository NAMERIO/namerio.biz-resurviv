"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdToType = exports.Debug = exports.Config = exports.TypeToId = exports.IdToGameType = exports.IdToMapType = exports.AllowedBoost = exports.AllowedHeal = exports.AllowedEmotes = exports.AllowedMelee = exports.AllowedSkins = exports.RedZoneStages = exports.LootTables = exports.Explosions = exports.Bullets = exports.Weapons = exports.Items = exports.Maps = exports.Objects = void 0;
const misc_1 = require("./misc");
// todo Give all of these actual typings
exports.Objects = (0, misc_1.readJSON)("data/objects.json");
exports.Maps = (0, misc_1.readJSON)("data/maps.json");
exports.Items = (0, misc_1.readJSON)("data/items.json");
exports.Weapons = Object.assign((0, misc_1.readJSON)("data/guns.json"), (0, misc_1.readJSON)("data/melee.json"), (0, misc_1.readJSON)("data/throwables.json"));
exports.Bullets = (0, misc_1.readJSON)("data/bullets.json");
exports.Explosions = (0, misc_1.readJSON)("data/explosions.json");
exports.LootTables = (0, misc_1.readJSON)("data/lootTables.json");
exports.RedZoneStages = {
    DeathMatch: (0, misc_1.readJSON)("data/dmRedZoneStages.json"),
    BattleRoyale: (0, misc_1.readJSON)("data/brRedZoneStages.json"),
};
exports.AllowedSkins = (0, misc_1.readJSON)("data/allowedSkins.json");
exports.AllowedMelee = (0, misc_1.readJSON)("data/allowedMelee.json");
exports.AllowedEmotes = (0, misc_1.readJSON)("data/allowedEmotes.json");
exports.AllowedHeal = (0, misc_1.readJSON)("data/allowedHeal.json");
exports.AllowedBoost = (0, misc_1.readJSON)("data/allowedBoost.json");
exports.IdToMapType = (0, misc_1.readJSON)("data/idToMapType.json");
exports.IdToGameType = (0, misc_1.readJSON)("data/idToGameType.json");
exports.TypeToId = (0, misc_1.readJSON)("data/typeToId.json");
exports.Config = (0, misc_1.readJSON)("config.json");
exports.Debug = exports.Config.debug ?? {};
exports.Config.diagonalSpeed = exports.Config.movementSpeed / Math.SQRT2;
/**
 * Return the type assigned to an ID.
 * @param id The ID to check for.
 */
function IdToType(id) {
    for (const type in exports.TypeToId)
        if (exports.TypeToId[type] === id)
            return type;
    return "";
}
exports.IdToType = IdToType;
//# sourceMappingURL=data.js.map