import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { SettingsDocument } from "api-calls/character-campaign-settings/_character-campaign-settings.type";

export const showOrHideCustomMove = createApiFunction<
  {
    campaignId?: string;
    characterId?: string;
    moveId: string;
    hidden: boolean;
  },
  void
>(async (params) => {
  const { campaignId, characterId, moveId, hidden } = params;

  if (!campaignId && !characterId) {
    throw new Error("Either campaign or character ID must be defined.");
  }

  const table = campaignId ? "campaign_settings" : "character_settings";
  const idColumn = campaignId ? "campaign_id" : "character_id";
  const id = (campaignId ?? characterId) as string;

  // Fetch current settings
  const { data } = await (supabase as any).from(table)
    .select("settings")
    .eq(idColumn, id)
    .single();

  const current = (data?.settings ?? {}) as Partial<SettingsDocument>;
  const existing: string[] = current.hiddenCustomMoveIds ?? [];

  const updated = hidden
    ? Array.from(new Set([...existing, moveId]))
    : existing.filter((id) => id !== moveId);

  const newSettings: Partial<SettingsDocument> = {
    ...current,
    hiddenCustomMoveIds: updated,
  };

  const { error } = await (supabase as any).from(table)
    .upsert({ [idColumn]: id, settings: newSettings });

  if (error) throw error;
}, "Failed to update custom move visibility.");
