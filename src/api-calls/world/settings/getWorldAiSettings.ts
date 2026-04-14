import { supabase } from "config/supabase.config";
import { WorldAiSettings } from "./_worldSettings.type";
import { WORLD_AI_SETTINGS_TABLE } from "./_getRef";

export async function getWorldAiSettings(
  worldId: string
): Promise<WorldAiSettings | undefined> {
  const { data, error } = await supabase
    .from(WORLD_AI_SETTINGS_TABLE)
    .select("*")
    .eq("world_id", worldId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return undefined;
    throw error;
  }

  if (!data) return undefined;

  return {
    provider: data.provider,
    modeConfigs: data.mode_configs ?? undefined,
    worldTonePrompt: data.world_tone_prompt ?? undefined,
  } as WorldAiSettings;
}
