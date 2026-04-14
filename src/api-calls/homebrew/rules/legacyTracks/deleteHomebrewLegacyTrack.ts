import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_LEGACY_TRACKS_TABLE } from "./_getRef";

export const deleteHomebrewLegacyTrack = createApiFunction<
  {
    legacyTrackId: string;
  },
  void
>(async (params) => {
  const { legacyTrackId } = params;
  const { error } = await supabase
    .from(HOMEBREW_LEGACY_TRACKS_TABLE)
    .delete()
    .eq("id", legacyTrackId);
  if (error) throw error;
}, "Failed to delete legacy track.");
