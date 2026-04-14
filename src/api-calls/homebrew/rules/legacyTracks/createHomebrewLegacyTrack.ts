import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_LEGACY_TRACKS_TABLE } from "./_getRef";
import { HomebrewLegacyTrackDocument } from "api-calls/homebrew/rules/legacyTracks/_homebrewLegacyTrack.type";

export const createHomebrewLegacyTrack = createApiFunction<
  {
    legacyTrack: HomebrewLegacyTrackDocument;
  },
  void
>(async (params) => {
  const { legacyTrack } = params;
  const { error } = await supabase.from(HOMEBREW_LEGACY_TRACKS_TABLE).insert({
    collection_id: legacyTrack.collectionId,
    data: legacyTrack,
  } as any);
  if (error) throw error;
}, "Failed to create legacy track.");
