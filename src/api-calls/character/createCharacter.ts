import { supabase } from "config/supabase.config";
import { momentumTrack } from "data/defaultTracks";
import { AssetDocument } from "api-calls/assets/_asset.type";
import {
  CharacterDocument,
  StatsMap,
} from "api-calls/character/_character.type";
import { characterDocumentToInsert, CHARACTER_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const createCharacter = createApiFunction<
  {
    uid: string;
    name: string;
    stats: StatsMap;
    assets: AssetDocument[];
    expansionIds?: string[];
    backstory?: string;
    pronouns?: string;
    callsign?: string;
    characteristics?: string;
  },
  string
>(async (params) => {
  const {
    uid,
    name,
    stats,
    assets,
    expansionIds,
    backstory,
    pronouns,
    callsign,
    characteristics,
  } = params;

  const character: CharacterDocument = {
    uid,
    name,
    stats,
    conditionMeters: {},
    specialTracks: {},
    momentum: momentumTrack.startingValue,
  };
  if (expansionIds) character.expansionIds = expansionIds;
  if (backstory) character.backstory = backstory;
  if (pronouns) character.pronouns = pronouns;
  if (callsign) character.callsign = callsign;
  if (characteristics) character.characteristics = characteristics;

  const insert = characterDocumentToInsert(character);

  const { data, error } = await supabase
    .from(CHARACTER_TABLE)
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  const id = data.id;

  // Insert initial assets
  if (assets.length > 0) {
    const assetInserts = assets.map((asset) => ({
      character_id: id,
      data: asset as unknown as import("lib/database.types").Json,
      order: asset.order,
    }));
    // Best-effort; don't fail character creation if assets fail
    await supabase.from("character_assets").insert(assetInserts).then();
  }

  return id;
}, "Failed to create your character");
