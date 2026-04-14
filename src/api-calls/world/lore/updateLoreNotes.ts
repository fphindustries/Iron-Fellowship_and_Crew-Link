import { supabase } from "config/supabase.config";
import { LORE_PUBLIC_NOTES_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
  loreId: string;
  notes: Uint8Array;
  isBeacon?: boolean;
}

export const updateLoreNotes = createApiFunction<Params, void>(
  async (params) => {
    const { loreId, notes, isBeacon } = params;

    const encoded = btoa(String.fromCharCode(...notes));

    if (isBeacon) {
      const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
      const supabaseKey = (supabase as unknown as { supabaseKey: string }).supabaseKey;
      if (notes && supabaseUrl) {
        fetch(
          `${supabaseUrl}/rest/v1/${LORE_PUBLIC_NOTES_TABLE}?lore_id=eq.${loreId}`,
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
      .from(LORE_PUBLIC_NOTES_TABLE)
      .upsert({ lore_id: loreId, notes: encoded }, { onConflict: "lore_id" });

    if (error) throw error;
  },
  "Failed to save changes to notes."
);
