import { supabase } from "config/supabase.config";
import { AssetDocument } from "api-calls/assets/_asset.type";

interface AssetRow {
  id: string;
  data: AssetDocument;
}

export function listenToAssets(
  characterId: string | undefined,
  campaignId: string | undefined,
  onAssets: (assets: { [assetId: string]: AssetDocument }) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void
): () => void {
  if (!characterId && !campaignId) {
    onError(new Error("Either character or campaign id must be defined."));
    return () => {};
  }

  const table = characterId ? "character_assets" : "campaign_assets";
  const column = characterId ? "character_id" : "campaign_id";
  const id = (characterId ?? campaignId) as string;

  const fetchAll = () =>
    (supabase as any).from(table)
      .select("*")
      .eq(column, id)
      .then(
        ({
          data,
          error,
        }: {
          data: AssetRow[] | null;
          error: unknown;
        }) => {
          if (error) {
            onError(error);
            return;
          }
          const assetMap: { [assetId: string]: AssetDocument } = {};
          if (data) {
            data.forEach((row) => {
              assetMap[row.id] = row.data;
            });
          }
          onAssets(assetMap);
        }
      );

  const channel = supabase
    .channel(`${table}:${column}:${id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `${column}=eq.${id}`,
      },
      () => {
        fetchAll();
      }
    )
    .subscribe();

  fetchAll();

  return () => {
    supabase.removeChannel(channel);
  };
}
