import { supabase } from "config/supabase.config";
import { constructNPCImagesPath, NPCS_TABLE } from "./_getRef";
import { replaceImage } from "lib/storage.lib";
import { createApiFunction } from "api-calls/createApiFunction";

export const uploadNPCImage = createApiFunction<
  { worldId: string; npcId: string; image: File; oldImageFilename?: string },
  void
>(async (params) => {
  const { worldId, npcId, image, oldImageFilename } = params;

  await replaceImage(
    constructNPCImagesPath(worldId, npcId),
    oldImageFilename,
    image
  );

  const { error } = await supabase
    .from(NPCS_TABLE)
    .update({ portrait_url: image.name, updated_at: new Date().toISOString() })
    .eq("id", npcId);

  if (error) throw error;
}, "Failed to upload image");
