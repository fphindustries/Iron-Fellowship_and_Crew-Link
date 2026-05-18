import { useEffect } from "react";
import { useStore } from "stores/store";
import { useCampaignAssetsQuery } from "hooks/queries/useCampaignsQuery";
import { AssetDocument } from "types/Asset.type";

export function useListenToSharedAssets() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const { data: assetRows } = useCampaignAssetsQuery(campaignId);

  useEffect(() => {
    if (!assetRows) return;
    const assets: Record<string, AssetDocument> = {};
    assetRows.forEach((row) => {
      assets[row.id] = { id: row.id, ...(row.dataJson ?? {}) };
    });
    useStore.setState((store) => {
      store.campaigns.currentCampaign.assets.assets = assets;
      store.campaigns.currentCampaign.assets.loading = false;
    });
  }, [assetRows]);
}
