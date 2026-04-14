import { createApiFunction } from "api-calls/createApiFunction";
import { removeCharacterFromCampaign } from "api-calls/campaign/removeCharacterFromCampaign";
import { deleteNotes } from "api-calls/notes/deleteNotes";
import { constructCharacterPortraitFolderPath, CHARACTER_TABLE } from "./_getRef";
import { deleteAllLogs } from "api-calls/game-log/deleteAllLogs";
import { deleteAllProgressTracks } from "api-calls/tracks/deleteAllProgressTracks";
import { deleteAllAssets } from "api-calls/assets/deleteAllAssets";
import { deleteImage } from "lib/storage.lib";
import { supabase } from "config/supabase.config";

export const deleteCharacter = createApiFunction<
  {
    uid: string;
    characterId: string;
    campaignId?: string;
    portraitFilename?: string;
  },
  void
>(async (params) => {
  const { uid, characterId, campaignId, portraitFilename } = params;

  if (campaignId) {
    const { data: userData } = await supabase.auth.getUser();
    await removeCharacterFromCampaign({
      uid: userData.user?.id ?? "",
      campaignId,
      characterId,
    });
  }

  const cleanupTasks: PromiseLike<unknown>[] = [];

  if (portraitFilename) {
    cleanupTasks.push(
      deleteImage(
        constructCharacterPortraitFolderPath(uid, characterId),
        portraitFilename
      )
    );
  }

  cleanupTasks.push(deleteNotes({ characterId }));
  cleanupTasks.push(deleteAllAssets({ characterId }));
  cleanupTasks.push(deleteAllLogs({ characterId }));
  cleanupTasks.push(deleteAllProgressTracks({ characterId }));

  // Also delete character settings via supabase (character_settings table)
  cleanupTasks.push(
    supabase
      .from("character_settings")
      .delete()
      .eq("character_id", characterId)
      .then()
  );

  await Promise.all(cleanupTasks);

  const { error } = await supabase
    .from(CHARACTER_TABLE)
    .delete()
    .eq("id", characterId);

  if (error) throw error;
}, "Failed to delete character.");
