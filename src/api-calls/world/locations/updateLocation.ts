import { supabase } from "config/supabase.config";
import { Location } from "types/Locations.type";
import { convertUpdateDataToDatabase, LOCATIONS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface LocationParams {
  worldId: string;
  locationId: string;
  location: Partial<Location>;
}

export const updateLocation = createApiFunction<LocationParams, void>(
  async (params) => {
    const { locationId, location } = params;

    const dbUpdate = convertUpdateDataToDatabase(location);

    const { error } = await supabase
      .from(LOCATIONS_TABLE)
      .update(dbUpdate as any)
      .eq("id", locationId);

    if (error) throw error;
  },
  "Failed to update location."
);
