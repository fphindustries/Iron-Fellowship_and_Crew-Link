import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_LEGACY_TRACKS_TABLE } from "./_getRef";
import { HomebrewLegacyTrackDocument } from "api-calls/homebrew/rules/legacyTracks/_homebrewLegacyTrack.type";

export const updateHomebrewLegacyTrack = createApiFunction<
  {
    legacyTrackId: string;
    legacyTrack: Partial<HomebrewLegacyTrackDocument>;
  },
  void
>(async (params) => {
  const { legacyTrackId, legacyTrack } = params;

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_LEGACY_TRACKS_TABLE)
    .select("data")
    .eq("id", legacyTrackId)
    .single();

  if (fetchError) throw fetchError;

  const updatedData = { ...(existing?.data as object ?? {}), ...legacyTrack };

  const { error } = await supabase
    .from(HOMEBREW_LEGACY_TRACKS_TABLE)
    .update({ data: updatedData })
    .eq("id", legacyTrackId);

  if (error) throw error;
}, "Failed to update legacy track.");
