import { constructLocationImagesPath, LOCATIONS_TABLE } from "./_getRef";
import { replaceImage, uploadImage } from "lib/storage.lib";
import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const uploadLocationImage = createApiFunction<
  {
    worldId: string;
    locationId: string;
    image: File;
    oldImageFilename?: string;
  },
  void
>(async (params) => {
  const { worldId, locationId, image, oldImageFilename } = params;

  const folderPath = constructLocationImagesPath(worldId, locationId);

  if (oldImageFilename) {
    await replaceImage(folderPath, oldImageFilename, image);
  } else {
    await uploadImage(folderPath, image);
  }

  const filename = image.name;

  // Fetch current data to merge imageFilenames
  const { data, error: fetchError } = await supabase
    .from(LOCATIONS_TABLE)
    .select("data")
    .eq("id", locationId)
    .single();

  if (fetchError) throw fetchError;

  const currentData = (data?.data as Record<string, unknown>) ?? {};

  const { error } = await supabase
    .from(LOCATIONS_TABLE)
    .update({
      data: { ...currentData, imageFilenames: [filename] },
      updated_at: new Date().toISOString(),
    })
    .eq("id", locationId);

  if (error) throw error;
}, "Failed to upload image");
