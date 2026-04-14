import { supabase } from "config/supabase.config";
import {
  constructNPCImagesPath,
  NPCS_TABLE,
  NPC_PUBLIC_NOTES_TABLE,
  NPC_PRIVATE_NOTES_TABLE,
} from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { deleteImage } from "lib/storage.lib";

interface Params {
  worldId: string;
  npcId: string;
  imageFilename?: string;
}

export const deleteNPC = createApiFunction<Params, void>(async (params) => {
  const { worldId, npcId, imageFilename } = params;

  const deletePromises: PromiseLike<unknown>[] = [
    supabase.from(NPC_PUBLIC_NOTES_TABLE).delete().eq("npc_id", npcId),
    supabase.from(NPC_PRIVATE_NOTES_TABLE).delete().eq("npc_id", npcId),
    supabase.from(NPCS_TABLE).delete().eq("id", npcId),
  ];

  if (imageFilename) {
    deletePromises.push(
      deleteImage(constructNPCImagesPath(worldId, npcId), imageFilename)
    );
  }

  await Promise.all(deletePromises);
}, "Failed to delete npc.");
