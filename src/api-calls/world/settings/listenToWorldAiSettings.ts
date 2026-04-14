import { supabase } from "config/supabase.config";
import { WorldAiSettings } from "./_worldSettings.type";
import { WORLD_AI_SETTINGS_TABLE } from "./_getRef";

export const listenToWorldAiSettings = (
  worldId: string,
  onSettings: (settings: WorldAiSettings | undefined) => void
): (() => void) => {
  const refetch = () => {
    supabase
      .from(WORLD_AI_SETTINGS_TABLE)
      .select("*")
      .eq("world_id", worldId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          if (error.code === "PGRST116") {
            onSettings(undefined);
          }
          return;
        }
        if (!data) {
          onSettings(undefined);
          return;
        }
        onSettings({
          provider: data.provider,
          modeConfigs: data.mode_configs ?? undefined,
          worldTonePrompt: data.world_tone_prompt ?? undefined,
        } as WorldAiSettings);
      });
  };

  const channel = supabase
    .channel(`world_ai_settings:${worldId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: WORLD_AI_SETTINGS_TABLE,
        filter: `world_id=eq.${worldId}`,
      },
      () => refetch()
    )
    .subscribe();

  refetch();

  return () => {
    supabase.removeChannel(channel);
  };
};
