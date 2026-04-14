import { supabase } from "config/supabase.config";
import {
  constructLocationImagesPath,
  LOCATIONS_TABLE,
  LOCATION_PUBLIC_NOTES_TABLE,
  LOCATION_PRIVATE_NOTES_TABLE,
} from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { deleteImage } from "lib/storage.lib";

interface Params {
  worldId: string;
  locationId: string;
  imageFilename?: string;
}

export const deleteLocation = createApiFunction<Params, void>(
  async (params) => {
    const { worldId, locationId, imageFilename } = params;

    const deletePromises: PromiseLike<unknown>[] = [
      supabase
        .from(LOCATION_PUBLIC_NOTES_TABLE)
        .delete()
        .eq("location_id", locationId),
      supabase
        .from(LOCATION_PRIVATE_NOTES_TABLE)
        .delete()
        .eq("location_id", locationId),
      supabase.from(LOCATIONS_TABLE).delete().eq("id", locationId),
    ];

    if (imageFilename) {
      deletePromises.push(
        deleteImage(
          constructLocationImagesPath(worldId, locationId),
          imageFilename
        )
      );
    }

    await Promise.all(deletePromises);
  },
  "Failed to delete location."
);
