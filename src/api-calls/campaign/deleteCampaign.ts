import { supabase } from "config/supabase.config";
import { CHARACTER_TABLE } from "../character/_getRef";
import { CAMPAIGN_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { deleteNotes } from "api-calls/notes/deleteNotes";
import { deleteAllProgressTracks } from "api-calls/tracks/deleteAllProgressTracks";
import { deleteAllLogs } from "api-calls/game-log/deleteAllLogs";
import { deleteAllAssets } from "api-calls/assets/deleteAllAssets";

export const deleteCampaign = createApiFunction<
  { campaignId: string; characterIds: string[] },
  void
>(async (params) => {
  const { campaignId, characterIds } = params;

  // Remove campaign association from all characters
  const characterPromises = characterIds.map(async (characterId) => {
    const { error } = await supabase
      .from(CHARACTER_TABLE)
      .update({ campaign_id: null } as any)
      .eq("id", characterId);
    if (error) throw error;
  });

  await Promise.all(characterPromises);

  // Delete campaign and all related data in parallel
  const { error: campaignError } = await supabase
    .from(CAMPAIGN_TABLE)
    .delete()
    .eq("id", campaignId);

  if (campaignError) throw campaignError;

  await Promise.all([
    deleteNotes({ campaignId }),
    deleteAllLogs({ campaignId }),
    deleteAllAssets({ campaignId }),
    deleteAllProgressTracks({ campaignId }),
  ]);
}, "Failed to delete campaign.");
