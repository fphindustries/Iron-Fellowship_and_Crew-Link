// Supabase migration: Firestore refs replaced with table name constants.
import { CharacterDocument, InitiativeStatus } from "./_character.type";
import type { Database } from "lib/database.types";

export const CHARACTER_TABLE = "characters";

export type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];
export type CharacterInsert =
  Database["public"]["Tables"]["characters"]["Insert"];
export type CharacterUpdate =
  Database["public"]["Tables"]["characters"]["Update"];

export function constructCharacterPortraitFolderPath(
  uid: string,
  characterId: string
) {
  return `/characters/${uid}/characters/${characterId}`;
}

export function constructCharacterPortraitPath(
  uid: string,
  characterId: string,
  filename: string
) {
  return `/characters/${uid}/characters/${characterId}/${filename}`;
}

/** Map a Supabase DB row to the CharacterDocument shape used by the app. */
export function rowToCharacterDocument(
  row: CharacterRow & { id: string }
): CharacterDocument & { id: string } {
  return {
    id: row.id,
    uid: row.uid,
    name: row.name,
    stats: (row.stats ?? {}) as CharacterDocument["stats"],
    conditionMeters: (row.condition_meters ?? {}) as Record<string, number>,
    specialTracks: (row.special_tracks ?? {}) as unknown as CharacterDocument["specialTracks"],
    momentum: row.momentum,
    debilities: (row.debilities ?? {}) as Record<string, boolean>,
    initiativeStatus: row.initiative_status as InitiativeStatus | undefined,
    profileImage: row.portrait_settings as CharacterDocument["profileImage"],
    experience: row.experience !== undefined
      ? { earned: row.experience, spent: row.experience_spent }
      : undefined,
  };
}

/** Map a CharacterDocument partial to the Supabase Update shape. */
export function characterDocumentToUpdate(
  doc: Partial<CharacterDocument>
): CharacterUpdate {
  const update: CharacterUpdate = {};
  if (doc.name !== undefined) update.name = doc.name;
  if (doc.stats !== undefined) update.stats = doc.stats as CharacterUpdate["stats"];
  if (doc.conditionMeters !== undefined)
    update.condition_meters = doc.conditionMeters as CharacterUpdate["condition_meters"];
  if (doc.specialTracks !== undefined)
    update.special_tracks = doc.specialTracks as unknown as CharacterUpdate["special_tracks"];
  if (doc.momentum !== undefined) update.momentum = doc.momentum;
  if (doc.debilities !== undefined)
    update.debilities = doc.debilities as CharacterUpdate["debilities"];
  if (doc.initiativeStatus !== undefined)
    update.initiative_status = doc.initiativeStatus ?? null;
  if ("profileImage" in doc)
    update.portrait_settings =
      doc.profileImage as CharacterUpdate["portrait_settings"];
  if (doc.experience !== undefined) {
    if (doc.experience.earned !== undefined)
      update.experience = doc.experience.earned;
    if (doc.experience.spent !== undefined)
      update.experience_spent = doc.experience.spent;
  }
  return update;
}

/** Map a new CharacterDocument to the Supabase Insert shape. */
export function characterDocumentToInsert(
  doc: CharacterDocument
): CharacterInsert {
  return {
    uid: doc.uid,
    name: doc.name,
    stats: doc.stats as CharacterInsert["stats"],
    condition_meters: (doc.conditionMeters ?? {}) as CharacterInsert["condition_meters"],
    special_tracks: (doc.specialTracks ?? {}) as unknown as CharacterInsert["special_tracks"],
    momentum: doc.momentum,
    debilities: (doc.debilities ?? {}) as CharacterInsert["debilities"],
    initiative_status: doc.initiativeStatus ?? null,
    portrait_settings: doc.profileImage as CharacterInsert["portrait_settings"],
    game_system: "ironsworn", // default; caller may override
  };
}
