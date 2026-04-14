import { supabase } from "config/supabase.config";
import {
  SECTOR_PUBLIC_NOTES_TABLE,
  SECTOR_PRIVATE_NOTES_TABLE,
} from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
  sectorId: string;
  notes: Uint8Array;
  isPrivate?: boolean;
  isBeacon?: boolean;
}

export const updateSectorNotes = createApiFunction<Params, void>(
  async (params) => {
    const { sectorId, notes, isBeacon, isPrivate } = params;

    const table = isPrivate ? SECTOR_PRIVATE_NOTES_TABLE : SECTOR_PUBLIC_NOTES_TABLE;
    const encoded = btoa(String.fromCharCode(...notes));

    if (isBeacon) {
      const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
      const supabaseKey = (supabase as unknown as { supabaseKey: string }).supabaseKey;
      if (notes && supabaseUrl) {
        fetch(
          `${supabaseUrl}/rest/v1/${table}?sector_id=eq.${sectorId}`,
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
      .from(table as any)
      .upsert({ sector_id: sectorId, notes: encoded } as any, { onConflict: "sector_id" });

    if (error) throw error;
  },
  "Failed to save changes to notes."
);
