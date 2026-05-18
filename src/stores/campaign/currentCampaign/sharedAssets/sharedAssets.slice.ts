import { CreateSliceType } from "stores/store.type";
import { SharedAssetSlice } from "./sharedAssets.slice.type";
import { defaultSharedAssetsSlice } from "./sharedAssets.slice.default";
import { api } from "config/api.config";
import { AssetDocument } from "types/Asset.type";

function toAsset(row: any): AssetDocument {
  return { id: row.id, ...(row.dataJson ?? {}) };
}

export const createSharedAssetsSlice: CreateSliceType<SharedAssetSlice> = (
  set,
  getState
) => ({
  ...defaultSharedAssetsSlice,

  subscribe: (_campaignId) => {
    // Data is now fetched by useCampaignAssetsQuery via useListenToSharedAssets.
    return () => {};
  },

  addAsset: (asset) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    if (!campaignId) return Promise.reject("Campaign ID not defined");
    return api
      .post<any>(`/api/campaigns/${campaignId}/assets`, asset)
      .then((row) => {
        const saved = toAsset(row);
        set((store) => {
          store.campaigns.currentCampaign.assets.assets[saved.id] = saved;
        });
      });
  },

  removeAsset: (assetId) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    if (!campaignId) return Promise.reject("Campaign ID not defined");
    return api.del<void>(`/api/campaigns/${campaignId}/assets/${assetId}`).then(() => {
      set((store) => {
        delete store.campaigns.currentCampaign.assets.assets[assetId];
      });
    });
  },

  updateAssetCheckbox: (assetId, abilityIndex, checked) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    if (!campaignId) return Promise.reject("Campaign ID not defined");
    const existing = getState().campaigns.currentCampaign.assets.assets[assetId];
    const enabledAbilities = { ...(existing?.enabledAbilities ?? {}), [abilityIndex]: checked };
    const updated = { ...existing, enabledAbilities };
    return api
      .patch<any>(`/api/campaigns/${campaignId}/assets/${assetId}`, updated)
      .then(() => {
        set((store) => {
          store.campaigns.currentCampaign.assets.assets[assetId] = updated;
        });
      });
  },

  updateAssetOption: (assetId, optionKey, value) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    if (!campaignId) return Promise.reject("Campaign ID not defined");
    const existing = getState().campaigns.currentCampaign.assets.assets[assetId];
    const optionValues = { ...(existing?.optionValues ?? {}), [optionKey]: value };
    const updated = { ...existing, optionValues };
    return api
      .patch<any>(`/api/campaigns/${campaignId}/assets/${assetId}`, updated)
      .then(() => {
        set((store) => {
          store.campaigns.currentCampaign.assets.assets[assetId] = updated;
        });
      });
  },

  updateAssetControl: (assetId, controlKey, value) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    if (!campaignId) return Promise.reject("Campaign ID not defined");
    const existing = getState().campaigns.currentCampaign.assets.assets[assetId];
    const controlValues = { ...(existing?.controlValues ?? {}), [controlKey]: value };
    const updated = { ...existing, controlValues };
    return api
      .patch<any>(`/api/campaigns/${campaignId}/assets/${assetId}`, updated)
      .then(() => {
        set((store) => {
          store.campaigns.currentCampaign.assets.assets[assetId] = updated;
        });
      });
  },

  resetStore: () => {
    set((store) => {
      store.campaigns.currentCampaign.assets = {
        ...store.campaigns.currentCampaign.assets,
        ...defaultSharedAssetsSlice,
      };
    });
  },
});
