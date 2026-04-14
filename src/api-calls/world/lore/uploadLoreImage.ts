import { supabase } from "config/supabase.config";
import { constructLoreImagesPath, LORE_TABLE } from "./_getRef";
import { replaceImage } from "lib/storage.lib";
import { createApiFunction } from "api-calls/createApiFunction";

export const uploadLoreImage = createApiFunction<
  { worldId: string; loreId: string; image: File; oldImageFilename?: string },
  void
>(async (params) => {
  const { worldId, loreId, image, oldImageFilename } = params;

  await replaceImage(
    constructLoreImagesPath(worldId, loreId),
    oldImageFilename,
    image
  );

  const { error } = await supabase
    .from(LORE_TABLE)
    .update({ data: { imageFilenames: [image.name] }, updated_at: new Date().toISOString() })
    .eq("id", loreId);

  if (error) throw error;
}, "Failed to upload image");
