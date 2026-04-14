import { supabase } from "config/supabase.config";
import { SettingsDocument } from "api-calls/character-campaign-settings/_character-campaign-settings.type";

const DEFAULT_SETTINGS: SettingsDocument = {
  hiddenCustomMoveIds: [],
  hiddenCustomOraclesIds: [],
  customStats: [],
  customTracks: {},
};

export function listenToSettings(
  campaignId: string | undefined,
  characterId: string | undefined,
  onSettings: (settings: SettingsDocument) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void
): () => void {
  if (!campaignId && !characterId) {
    onError("Either campaign or character ID must be defined.");
    return () => {};
  }

  const table = campaignId ? "campaign_settings" : "character_settings";
  const idColumn = campaignId ? "campaign_id" : "character_id";
  const id = (campaignId ?? characterId) as string;
  const channelName = campaignId
    ? `campaign_settings:${campaignId}`
    : `character_settings:${characterId}`;

  async function fetchSettings() {
    const { data, error } = await (supabase as any).from(table)
      .select("settings")
      .eq(idColumn, id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No row found — use defaults
        onSettings({ ...DEFAULT_SETTINGS });
      } else {
        onError(error);
      }
      return;
    }

    onSettings({
      ...DEFAULT_SETTINGS,
      ...(data?.settings as Partial<SettingsDocument> | null ?? {}),
    });
  }

  fetchSettings().catch(onError);

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `${idColumn}=eq.${id}`,
      },
      () => fetchSettings().catch(onError)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
