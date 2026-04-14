import { supabase } from "config/supabase.config";
import { GMLocation } from "types/Locations.type";
import { LOCATION_PRIVATE_NOTES_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
  locationId: string;
  locationGMProperties: Partial<GMLocation>;
}

export const updateLocationGMProperties = createApiFunction<Params, void>(
  async (params) => {
    const { locationId, locationGMProperties } = params;
    const { gmNotes, ...fields } = locationGMProperties;

    const upsertData: Record<string, unknown> = {
      location_id: locationId,
    };

    if (gmNotes !== undefined) {
      upsertData.gm_notes = btoa(String.fromCharCode(...gmNotes));
    }

    if (Object.keys(fields).length > 0) {
      // Fetch current fields to merge
      const { data } = await supabase
        .from(LOCATION_PRIVATE_NOTES_TABLE)
        .select("fields")
        .eq("location_id", locationId)
        .single();

      upsertData.fields = { ...(data?.fields as object ?? {}), ...fields };
    }

    const { error } = await supabase
      .from(LOCATION_PRIVATE_NOTES_TABLE)
      .upsert(upsertData as any, { onConflict: "location_id" });

    if (error) throw error;
  },
  "Failed to update location."
);
