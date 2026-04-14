import { supabase } from "config/supabase.config";
import { constructLoreImagesPath, LORE_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { deleteImage } from "lib/storage.lib";

interface Params {
  worldId: string;
  loreId: string;
  imageFilename?: string;
}

export const deleteLore = createApiFunction<Params, void>(async (params) => {
  const { worldId, loreId, imageFilename } = params;

  const { error } = await supabase
    .from(LORE_TABLE)
    .delete()
    .eq("id", loreId);

  if (error) throw error;

  if (imageFilename) {
    await deleteImage(constructLoreImagesPath(worldId, loreId), imageFilename);
  }
}, "Failed to delete lore document.");
