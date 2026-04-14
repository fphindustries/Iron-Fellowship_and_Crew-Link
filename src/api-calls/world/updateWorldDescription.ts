import { supabase } from "config/supabase.config";
import { WORLD_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateWorldDescription = createApiFunction<
  {
    worldId: string;
    description: Uint8Array;
    isBeaconRequest?: boolean;
  },
  void
>(async (params) => {
  const { worldId, description, isBeaconRequest } = params;

  const encoded = btoa(String.fromCharCode(...description));

  if (isBeaconRequest) {
    // Use keepalive fetch for beacon requests (page unload)
    const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
    const supabaseKey = (supabase as unknown as { supabaseKey: string }).supabaseKey;
    if (description && supabaseUrl) {
      fetch(`${supabaseUrl}/rest/v1/${WORLD_TABLE}?id=eq.${worldId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${window.sessionStorage.getItem("sb-access-token") ?? supabaseKey}`,
        },
        body: JSON.stringify({ description: encoded }),
        keepalive: true,
      }).catch((e) => console.error(e));
    }
    return;
  }

  const { error } = await supabase
    .from(WORLD_TABLE)
    .update({ description: encoded })
    .eq("id", worldId);

  if (error) throw error;
}, "Failed to update world description.");
