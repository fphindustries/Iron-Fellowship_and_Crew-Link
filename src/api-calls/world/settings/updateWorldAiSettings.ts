import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { WorldAiSettings } from "./_worldSettings.type";
import { WORLD_AI_SETTINGS_TABLE } from "./_getRef";

export const updateWorldAiSettings = createApiFunction<
  { worldId: string; settings: Partial<WorldAiSettings> },
  void
>(
  async (params) => {
    const { worldId, settings } = params;

    const upsertData: Record<string, unknown> = { world_id: worldId };
    if (settings.provider !== undefined) upsertData.provider = settings.provider;
    if (settings.modeConfigs !== undefined) upsertData.mode_configs = settings.modeConfigs;
    if (settings.worldTonePrompt !== undefined) upsertData.world_tone_prompt = settings.worldTonePrompt;

    const { error } = await supabase
      .from(WORLD_AI_SETTINGS_TABLE)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(upsertData as any, { onConflict: "world_id" });

    if (error) throw error;
  },
  "Failed to save AI settings."
);
