import { supabase } from "config/supabase.config";
import {
  SECTOR_LOCATION_PUBLIC_NOTES_TABLE,
  SECTOR_LOCATION_PRIVATE_NOTES_TABLE,
} from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
  sectorId: string;
  locationId: string;
  notes: Uint8Array;
  isPrivate?: boolean;
  isBeacon?: boolean;
}

export const updateSectorLocationNotes = createApiFunction<Params, void>(
  async (params) => {
    const { locationId, notes, isBeacon, isPrivate } = params;

    const table = isPrivate
      ? SECTOR_LOCATION_PRIVATE_NOTES_TABLE
      : SECTOR_LOCATION_PUBLIC_NOTES_TABLE;
    const encoded = btoa(String.fromCharCode(...notes));

    if (isBeacon) {
      const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
      const supabaseKey = (supabase as unknown as { supabaseKey: string }).supabaseKey;
      if (notes && supabaseUrl) {
        fetch(
          `${supabaseUrl}/rest/v1/${table}?sector_location_id=eq.${locationId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
              apikey: supabaseKey,
              Authorization: `Bearer ${window.sessionStorage.getItem("sb-access-token") ?? supabaseKey}`,
            },
            body: JSON.stringify({ notes: encoded }),
            keepalive: true,
          }
        ).catch((e) => console.error(e));
      }
      return;
    }

    const { error } = await supabase
      .from(table)
      .upsert({ sector_location_id: locationId, notes: encoded } as any, { onConflict: "sector_location_id" });

    if (error) throw error;
  },
  "Failed to save changes to notes."
);
