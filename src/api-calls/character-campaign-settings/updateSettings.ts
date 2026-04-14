import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { SettingsDocument } from "api-calls/character-campaign-settings/_character-campaign-settings.type";

export const updateSettings = createApiFunction<
  {
    campaignId?: string;
    characterId?: string;
    settings: Partial<SettingsDocument>;
    useUpdate?: boolean;
  },
  void
>(async (params) => {
  const { campaignId, characterId, settings, useUpdate } = params;

  if (!campaignId && !characterId) {
    throw new Error("Either character or campaign ID must be defined.");
  }

  const table = campaignId ? "campaign_settings" : "character_settings";
  const idColumn = campaignId ? "campaign_id" : "character_id";
  const id = (campaignId ?? characterId) as string;

  if (useUpdate) {
    // Merge new fields into existing settings
    const { data } = await (supabase as any).from(table)
      .select("settings")
      .eq(idColumn, id)
      .single();

    const current = (data?.settings ?? {}) as Partial<SettingsDocument>;
    const merged = { ...current, ...settings };

    const { error } = await (supabase as any).from(table)
      .upsert({ [idColumn]: id, settings: merged });

    if (error) throw error;
  } else {
    // setDoc with merge: true — merge at top level
    const { data } = await (supabase as any).from(table)
      .select("settings")
      .eq(idColumn, id)
      .single();

    const current = (data?.settings ?? {}) as Partial<SettingsDocument>;
    const merged = { ...current, ...settings };

    const { error } = await (supabase as any).from(table)
      .upsert({ [idColumn]: id, settings: merged });

    if (error) throw error;
  }
}, "Failed to update settings.");
