import { CreateSliceType } from "stores/store.type";
import { AssetSlice } from "./assets.slice.type";
import { defaultAssetsSlice } from "./assets.slice.default";
import { api } from "config/api.config";
import { AssetDocument } from "api-calls/assets/_asset.type";

function toAsset(row: any): AssetDocument {
  return { id: row.id, ...(row.dataJson ?? {}) };
}

export const createAssetsSlice: CreateSliceType<AssetSlice> = (
  set,
  getState
) => ({
  ...defaultAssetsSlice,

  subscribe: (characterId) => {
    let active = true;
    set((store) => {
      store.characters.currentCharacter.assets.loading = true;
    });
    api
      .get<any[]>(`/api/characters/${characterId}/assets`)
      .then((rows) => {
        if (!active) return;
        const assets: Record<string, AssetDocument> = {};
        rows.forEach((row) => {
          assets[row.id] = toAsset(row);
        });
        set((store) => {
          store.characters.currentCharacter.assets.assets = assets;
          store.characters.currentCharacter.assets.loading = false;
        });
      })
      .catch((error) => {
        if (!active) return;
        set((store) => {
          store.characters.currentCharacter.assets.loading = false;
          store.characters.currentCharacter.assets.error = String(error);
        });
      });
    return () => {
      active = false;
    };
  },

  addAsset: (asset) => {
    const characterId = getState().characters.currentCharacter.currentCharacterId;
    if (!characterId) return Promise.reject("Character ID not defined");
    return api
      .post<any>(`/api/characters/${characterId}/assets`, asset)
      .then((row) => {
        const saved = toAsset(row);
        set((store) => {
          store.characters.currentCharacter.assets.assets[saved.id] = saved;
        });
      });
  },

  removeAsset: (assetId) => {
    const characterId = getState().characters.currentCharacter.currentCharacterId;
    if (!characterId) return Promise.reject("Character ID not defined");
    return api.del<void>(`/api/characters/${characterId}/assets/${assetId}`).then(() => {
      set((store) => {
        delete store.characters.currentCharacter.assets.assets[assetId];
      });
    });
  },

  updateAssetCheckbox: (assetId, abilityIndex, checked) => {
    const characterId = getState().characters.currentCharacter.currentCharacterId;
    if (!characterId) return Promise.reject("Character ID not defined");
    const existing = getState().characters.currentCharacter.assets.assets[assetId];
    const enabledAbilities = { ...(existing?.enabledAbilities ?? {}), [abilityIndex]: checked };
    const updated = { ...existing, enabledAbilities };
    return api
      .patch<any>(`/api/characters/${characterId}/assets/${assetId}`, updated)
      .then(() => {
        set((store) => {
          store.characters.currentCharacter.assets.assets[assetId] = updated;
        });
      });
  },

  updateAssetOption: (assetId, optionKey, value) => {
    const characterId = getState().characters.currentCharacter.currentCharacterId;
    if (!characterId) return Promise.reject("Character ID not defined");
    const existing = getState().characters.currentCharacter.assets.assets[assetId];
    const optionValues = { ...(existing?.optionValues ?? {}), [optionKey]: value };
    const updated = { ...existing, optionValues };
    return api
      .patch<any>(`/api/characters/${characterId}/assets/${assetId}`, updated)
      .then(() => {
        set((store) => {
          store.characters.currentCharacter.assets.assets[assetId] = updated;
        });
      });
  },

  updateAssetControl: (assetId, controlKey, value) => {
    const characterId = getState().characters.currentCharacter.currentCharacterId;
    if (!characterId) return Promise.reject("Character ID not defined");
    const existing = getState().characters.currentCharacter.assets.assets[assetId];
    const controlValues = { ...(existing?.controlValues ?? {}), [controlKey]: value };
    const updated = { ...existing, controlValues };
    return api
      .patch<any>(`/api/characters/${characterId}/assets/${assetId}`, updated)
      .then(() => {
        set((store) => {
          store.characters.currentCharacter.assets.assets[assetId] = updated;
        });
      });
  },

  resetStore: () => {
    set((store) => {
      store.characters.currentCharacter.assets = {
        ...store.characters.currentCharacter.assets,
        ...defaultAssetsSlice,
      };
    });
  },
});
