import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { SettingsDocument } from "api-calls/character-campaign-settings/_character-campaign-settings.type";

export const showOrHideCustomOracle = createApiFunction<
  {
    campaignId?: string;
    characterId?: string;
    oracleId: string;
    hidden: boolean;
  },
  void
>(async (params) => {
  const { campaignId, characterId, oracleId, hidden } = params;

  if (!campaignId && !characterId) {
    throw new Error("Either character or campaign ID must be defined.");
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
  const existing: string[] = current.hiddenCustomOraclesIds ?? [];

  const updated = hidden
    ? Array.from(new Set([...existing, oracleId]))
    : existing.filter((id) => id !== oracleId);

  const newSettings: Partial<SettingsDocument> = {
    ...current,
    hiddenCustomOraclesIds: updated,
  };

  const { error } = await (supabase as any).from(table)
    .upsert({ [idColumn]: id, settings: newSettings });

  if (error) throw error;
}, "Failed to update visibility of custom oracle.");
