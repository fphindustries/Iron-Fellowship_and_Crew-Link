import { AssetDocument } from "types/Asset.type";
import { Datasworn } from "@datasworn/core";

export interface Background {
  rollMin: number;
  rollMax: number;
  name: string;
  assetNames: readonly [string, string];
}

export const BACKGROUNDS: Background[] = [
  { rollMin: 1,   rollMax: 5,   name: "Battlefield Medic",   assetNames: ["HEALER", "VETERAN"] },
  { rollMin: 6,   rollMax: 10,  name: "Delegate",             assetNames: ["BANNERSWORN", "DIPLOMAT"] },
  { rollMin: 11,  rollMax: 15,  name: "Exobiologist",         assetNames: ["LORE HUNTER", "NATURALIST"] },
  { rollMin: 16,  rollMax: 20,  name: "Far Trader",           assetNames: ["NAVIGATOR", "TRADER"] },
  { rollMin: 21,  rollMax: 25,  name: "Fugitive Hunter",      assetNames: ["ARMORED", "BOUNTY HUNTER"] },
  { rollMin: 26,  rollMax: 30,  name: "Hacker",               assetNames: ["INFILTRATOR", "TECH"] },
  { rollMin: 31,  rollMax: 35,  name: "Hotshot Pilot",        assetNames: ["ACE", "NAVIGATOR"] },
  { rollMin: 36,  rollMax: 40,  name: "Interstellar Scout",   assetNames: ["EXPLORER", "VOIDBORN"] },
  { rollMin: 41,  rollMax: 45,  name: "Monster Hunter",       assetNames: ["GUNNER", "SLAYER"] },
  { rollMin: 46,  rollMax: 50,  name: "Occultist",            assetNames: ["OUTCAST", "SHADE"] },
  { rollMin: 51,  rollMax: 55,  name: "Operative",            assetNames: ["INFILTRATOR", "BLADEMASTER"] },
  { rollMin: 56,  rollMax: 60,  name: "Outlaw",               assetNames: ["FUGITIVE", "GUNSLINGER"] },
  { rollMin: 61,  rollMax: 65,  name: "Private Investigator", assetNames: ["BRAWLER", "SLEUTH"] },
  { rollMin: 66,  rollMax: 70,  name: "Prophet",              assetNames: ["DEVOTANT", "SEER"] },
  { rollMin: 71,  rollMax: 75,  name: "Psionicist",           assetNames: ["KINETIC", "VESTIGE"] },
  { rollMin: 76,  rollMax: 80,  name: "Smuggler",             assetNames: ["COURIER", "SCOUNDREL"] },
  { rollMin: 81,  rollMax: 85,  name: "Spiritualist",         assetNames: ["HAUNTED", "EMPATH"] },
  { rollMin: 86,  rollMax: 90,  name: "Starship Engineer",    assetNames: ["GEARHEAD", "TECH"] },
  { rollMin: 91,  rollMax: 95,  name: "Supersoldier",         assetNames: ["AUGMENTED", "MERCENARY"] },
  { rollMin: 96,  rollMax: 100, name: "Tomb Raider",          assetNames: ["SCAVENGER", "SCOUNDREL"] },
];

export function getBackgroundForRoll(roll: number): Background | undefined {
  return BACKGROUNDS.find((b) => roll >= b.rollMin && roll <= b.rollMax);
}

export function resolvePathAssets(
  names: readonly [string, string],
  assetMap: Record<string, Datasworn.Asset>,
  startOrder = 0
): AssetDocument[] {
  return names.flatMap((name, i) => {
    const asset = Object.values(assetMap).find(
      (a) =>
        a.name.toUpperCase() === name.toUpperCase() &&
        a._id.includes("/path/")
    );
    if (!asset) return [];
    const enabledAbilities: Record<number, boolean> = {};
    asset.abilities.forEach((ability, idx) => {
      enabledAbilities[idx] = ability.enabled ?? idx === 0;
    });
    return [{ id: asset._id, enabledAbilities, order: startOrder + i }];
  });
}
