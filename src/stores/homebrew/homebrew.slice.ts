import { CreateSliceType } from "stores/store.type";
import { HomebrewEntry, HomebrewSlice } from "./homebrew.slice.type";
import { defaultHomebrewSlice } from "./homebrew.slice.default";
import { defaultExpansions } from "data/rulesets";
import { convertStoredOraclesToCollections } from "functions/convertStoredOraclesToCollections";
import { convertStoredMovesToCategories } from "functions/convertStoredMovesToCategories";
import { convertHomebrewAssetDocumentsToCollections } from "functions/convertHomebrewAssetDocumentsToCollections";
import { api } from "config/api.config";
import { PackageTypes } from "types/homebrew/HomebrewCollection.type";

type ContentType =
  | "stat"
  | "conditionMeter"
  | "nonLinearMeter"
  | "impact"
  | "legacyTrack"
  | "oracleCollection"
  | "oracleTable"
  | "moveCategory"
  | "move"
  | "assetCollection"
  | "asset";

const CONTENT_SLICE_KEY: Record<ContentType, keyof HomebrewEntry> = {
  stat: "stats",
  conditionMeter: "conditionMeters",
  nonLinearMeter: "nonLinearMeters",
  impact: "impactCategories",
  legacyTrack: "legacyTracks",
  oracleCollection: "oracleCollections",
  oracleTable: "oracleTables",
  moveCategory: "moveCategories",
  move: "moves",
  assetCollection: "assetCollections",
  asset: "assets",
};

function toCollectionDocument(row: any) {
  return {
    type: PackageTypes.Expansion,
    id: row.id,
    title: row.name ?? row.title ?? "",
    description: row.description,
    editors: row.editors ?? [],
    viewers: row.viewers ?? [],
    creator: row.creator,
    rulesetId: row.rulesetId ?? "",
  };
}

function findContentCollectionId(
  collections: Record<string, HomebrewEntry>,
  contentId: string,
  sliceKey: keyof HomebrewEntry
): string | undefined {
  for (const [, entry] of Object.entries(collections)) {
    const sliceData = (entry[sliceKey] as any) ?? undefined;
    if ((sliceData as any)?.data?.[contentId]) {
      return ((sliceData as any).data[contentId] as any)?.collectionId;
    }
  }
}

export const createHomebrewSlice: CreateSliceType<HomebrewSlice> = (
  set,
  getState
) => ({
  ...defaultHomebrewSlice,

  subscribe: (_uid) => {
    // Data is now fetched by useHomebrewQuery via useListenToHomebrew.
    return () => {};
  },

  subscribeToHomebrewContent: (homebrewIds) => {
    getState().rules.setExpansionIds(homebrewIds);

    const defaultHomebrewIds = homebrewIds.filter(
      (homebrewId) => defaultExpansions[homebrewId]
    );

    if (defaultHomebrewIds.length > 0) {
      getState().rules.rebuildOracles();
      getState().rules.rebuildMoves();
      getState().rules.rebuildStats();
      getState().rules.rebuildConditionMeters();
      getState().rules.rebuildSpecialTracks();
      getState().rules.rebuildImpacts();
      getState().rules.rebuildNonLinearMeters();
    }

    const filteredHomebrewIds = homebrewIds.filter(
      (homebrewId) => !defaultExpansions[homebrewId]
    );

    let active = true;

    filteredHomebrewIds.forEach(async (homebrewId) => {
      try {
        const [collection, contentItems] = await Promise.all([
          api.get<any>(`/api/homebrew/${homebrewId}`),
          api.get<any[]>(`/api/homebrew/${homebrewId}/content`),
        ]);
        if (!active) return;

        const grouped: Partial<Record<keyof HomebrewEntry, Record<string, any>>> = {};
        contentItems.forEach((item: any) => {
          const sliceKey = CONTENT_SLICE_KEY[item.contentType as ContentType];
          if (sliceKey) {
            if (!grouped[sliceKey]) grouped[sliceKey] = {};
            grouped[sliceKey]![item.id] = item.dataJson;
          }
        });

        set((store) => {
          store.homebrew.loading = false;
          store.homebrew.collections[homebrewId] = {
            ...store.homebrew.collections[homebrewId],
            base: toCollectionDocument(collection),
          };
          store.homebrew.sortedHomebrewCollectionIds = Object.keys(
            store.homebrew.collections
          )
            .filter((key) => {
              const c = store.homebrew.collections[key]?.base;
              return (
                c?.editors.includes(store.auth.uid ?? "") ||
                c?.viewers?.includes(store.auth.uid ?? "")
              );
            })
            .sort((k1, k2) =>
              (store.homebrew.collections[k1]?.base?.title ?? "").localeCompare(
                store.homebrew.collections[k2]?.base?.title ?? ""
              )
            );

          Object.entries(grouped).forEach(([sliceKey, data]) => {
            (store.homebrew.collections[homebrewId] as any)[sliceKey] = {
              data,
              loaded: true,
            };
          });
        });

        getState().homebrew.updateDataswornOracles(homebrewId);
        getState().homebrew.updateDataswornMoves(homebrewId);
        getState().homebrew.updateDataswornAssets(homebrewId);
        getState().rules.rebuildStats();
        getState().rules.rebuildConditionMeters();
        getState().rules.rebuildSpecialTracks();
        getState().rules.rebuildImpacts();
        getState().rules.rebuildNonLinearMeters();
      } catch {
        if (!active) return;
        set((store) => {
          store.homebrew.loading = false;
          store.homebrew.error = "Failed to load homebrew content";
        });
      }
    });

    return () => {
      active = false;
      getState().rules.setExpansionIds([]);
      getState().rules.rebuildOracles();
      getState().rules.rebuildMoves();
      getState().rules.rebuildStats();
      getState().rules.rebuildConditionMeters();
      getState().rules.rebuildSpecialTracks();
      getState().rules.rebuildImpacts();
      getState().rules.rebuildNonLinearMeters();
    };
  },

  createExpansion: async (expansion) => {
    const row = await api.post<any>("/api/homebrew", {
      name: expansion.title,
      description: expansion.description,
      editors: expansion.editors,
      viewers: expansion.viewers,
      rulesetId: expansion.rulesetId,
    });
    return row.id;
  },
  updateExpansion: async (id, expansion) => {
    await api.patch(`/api/homebrew/${id}`, {
      name: (expansion as any).title,
      description: (expansion as any).description,
      editors: (expansion as any).editors,
      viewers: (expansion as any).viewers,
    });
  },
  deleteExpansion: async (id) => {
    await api.del(`/api/homebrew/${id}`);
  },

  createStat: async (stat) => {
    await api.post(`/api/homebrew/${stat.collectionId}/content`, {
      contentType: "stat",
      dataJson: stat,
    });
  },
  updateStat: async (statId, stat) => {
    await api.patch(`/api/homebrew/${stat.collectionId}/content/${statId}`, {
      dataJson: stat,
    });
  },
  deleteStat: async (statId) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      statId,
      "stats"
    );
    if (collectionId) {
      await api.del(`/api/homebrew/${collectionId}/content/${statId}`);
    }
  },

  createConditionMeter: async (conditionMeter) => {
    await api.post(`/api/homebrew/${conditionMeter.collectionId}/content`, {
      contentType: "conditionMeter",
      dataJson: conditionMeter,
    });
  },
  updateConditionMeter: async (conditionMeterId, conditionMeter) => {
    await api.patch(
      `/api/homebrew/${conditionMeter.collectionId}/content/${conditionMeterId}`,
      { dataJson: conditionMeter }
    );
  },
  deleteConditionMeter: async (conditionMeterId) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      conditionMeterId,
      "conditionMeters"
    );
    if (collectionId) {
      await api.del(`/api/homebrew/${collectionId}/content/${conditionMeterId}`);
    }
  },

  createNonLinearMeter: async (meter) => {
    await api.post(`/api/homebrew/${(meter as any).collectionId}/content`, {
      contentType: "nonLinearMeter",
      dataJson: meter,
    });
  },
  updateNonLinearMeter: async (meterId, meter) => {
    await api.patch(
      `/api/homebrew/${(meter as any).collectionId}/content/${meterId}`,
      { dataJson: meter }
    );
  },
  deleteNonLinearMeter: async (meterId) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      meterId,
      "nonLinearMeters"
    );
    if (collectionId) {
      await api.del(`/api/homebrew/${collectionId}/content/${meterId}`);
    }
  },

  createImpactCategory: async (impactCategory) => {
    await api.post(`/api/homebrew/${impactCategory.collectionId}/content`, {
      contentType: "impact",
      dataJson: impactCategory,
    });
  },
  updateImpactCategory: async (impactCategoryId, impactCategory) => {
    await api.patch(
      `/api/homebrew/${impactCategory.collectionId}/content/${impactCategoryId}`,
      { dataJson: impactCategory }
    );
  },
  deleteImpactCategory: async (impactCategoryId) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      impactCategoryId,
      "impactCategories"
    );
    if (collectionId) {
      await api.del(`/api/homebrew/${collectionId}/content/${impactCategoryId}`);
    }
  },
  updateImpact: async (impactCategoryId, impact) => {
    // Look up the full category to patch it
    for (const entry of Object.values(getState().homebrew.collections)) {
      const categoryData = (entry.impactCategories?.data as any)?.[impactCategoryId];
      if (categoryData) {
        const updated = {
          ...categoryData,
          contents: { ...categoryData.contents, [impact.dataswornId]: impact },
        };
        await api.patch(
          `/api/homebrew/${categoryData.collectionId}/content/${impactCategoryId}`,
          { dataJson: updated }
        );
        return;
      }
    }
  },
  deleteImpact: async (impactCategoryId, impactId) => {
    for (const entry of Object.values(getState().homebrew.collections)) {
      const categoryData = (entry.impactCategories?.data as any)?.[impactCategoryId];
      if (categoryData) {
        const updated = { ...categoryData, contents: { ...categoryData.contents } };
        delete updated.contents[impactId];
        await api.patch(
          `/api/homebrew/${categoryData.collectionId}/content/${impactCategoryId}`,
          { dataJson: updated }
        );
        return;
      }
    }
  },

  createLegacyTrack: async (legacyTrack) => {
    await api.post(`/api/homebrew/${(legacyTrack as any).collectionId}/content`, {
      contentType: "legacyTrack",
      dataJson: legacyTrack,
    });
  },
  updateLegacyTrack: async (legacyTrackId, legacyTrack) => {
    await api.patch(
      `/api/homebrew/${(legacyTrack as any).collectionId}/content/${legacyTrackId}`,
      { dataJson: legacyTrack }
    );
  },
  deleteLegacyTrack: async (legacyTrackId) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      legacyTrackId,
      "legacyTracks"
    );
    if (collectionId) {
      await api.del(`/api/homebrew/${collectionId}/content/${legacyTrackId}`);
    }
  },

  createOracleCollection: async (oracleCollection) => {
    await api.post(
      `/api/homebrew/${(oracleCollection as any).collectionId}/content`,
      { contentType: "oracleCollection", dataJson: oracleCollection }
    );
  },
  updateOracleCollection: async (oracleCollectionId, oracleCollection) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      oracleCollectionId,
      "oracleCollections"
    );
    if (collectionId) {
      await api.patch(
        `/api/homebrew/${collectionId}/content/${oracleCollectionId}`,
        { dataJson: oracleCollection }
      );
    }
  },
  deleteOracleCollection: async (homebrewId, oracleCollectionId) => {
    const oracleTables =
      getState().homebrew.collections[homebrewId]?.oracleTables?.data ?? {};
    const filteredOracleTableIds = Object.keys(oracleTables).filter(
      (id) => (oracleTables[id] as any)?.oracleCollectionId === oracleCollectionId
    );

    const subCollections =
      getState().homebrew.collections[homebrewId]?.oracleCollections?.data ?? {};
    const filteredSubCollectionIds = Object.keys(subCollections).filter(
      (id) =>
        (subCollections[id] as any)?.parentOracleCollectionId === oracleCollectionId
    );

    await Promise.all([
      ...filteredOracleTableIds.map((id) =>
        api.del(`/api/homebrew/${homebrewId}/content/${id}`)
      ),
      ...filteredSubCollectionIds.map((id) =>
        getState().homebrew.deleteOracleCollection(homebrewId, id)
      ),
    ]);
    await api.del(`/api/homebrew/${homebrewId}/content/${oracleCollectionId}`);
  },

  createOracleTable: async (oracleTable) => {
    await api.post(
      `/api/homebrew/${(oracleTable as any).collectionId}/content`,
      { contentType: "oracleTable", dataJson: oracleTable }
    );
  },
  updateOracleTable: async (oracleTableId, oracleTable) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      oracleTableId,
      "oracleTables"
    );
    if (collectionId) {
      await api.patch(
        `/api/homebrew/${collectionId}/content/${oracleTableId}`,
        { dataJson: oracleTable }
      );
    }
  },
  deleteOracleTable: async (oracleTableId) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      oracleTableId,
      "oracleTables"
    );
    if (collectionId) {
      await api.del(`/api/homebrew/${collectionId}/content/${oracleTableId}`);
    }
  },

  updateDataswornOracles: (homebrewId) => {
    const homebrewCollection = getState().homebrew.collections[homebrewId];
    const oracles = homebrewCollection?.oracleCollections?.data;
    const oracleTables = homebrewCollection?.oracleTables?.data;
    if (oracles && oracleTables) {
      const collections = convertStoredOraclesToCollections(
        homebrewId,
        oracles,
        oracleTables
      );
      set((store) => {
        store.homebrew.collections[homebrewId].dataswornOracles = collections;
      });
      getState().rules.rebuildOracles();
    }
  },

  createMoveCategory: async (moveCategory) => {
    await api.post(
      `/api/homebrew/${(moveCategory as any).collectionId}/content`,
      { contentType: "moveCategory", dataJson: moveCategory }
    );
  },
  updateMoveCategory: async (moveCategoryId, moveCategory) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      moveCategoryId,
      "moveCategories"
    );
    if (collectionId) {
      await api.patch(
        `/api/homebrew/${collectionId}/content/${moveCategoryId}`,
        { dataJson: moveCategory }
      );
    }
  },
  deleteMoveCategory: async (homebrewId, moveCategoryId) => {
    const moves =
      getState().homebrew.collections[homebrewId]?.moves?.data ?? {};
    const filteredMoveIds = Object.keys(moves).filter(
      (id) => (moves[id] as any)?.categoryId === moveCategoryId
    );
    await Promise.all(
      filteredMoveIds.map((id) => getState().homebrew.deleteMove(id))
    );
    await api.del(`/api/homebrew/${homebrewId}/content/${moveCategoryId}`);
  },

  createMove: async (move) => {
    await api.post(`/api/homebrew/${(move as any).collectionId}/content`, {
      contentType: "move",
      dataJson: move,
    });
  },
  updateMove: async (moveId, move) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      moveId,
      "moves"
    );
    if (collectionId) {
      await api.patch(`/api/homebrew/${collectionId}/content/${moveId}`, {
        dataJson: move,
      });
    }
  },
  deleteMove: async (moveId) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      moveId,
      "moves"
    );
    if (collectionId) {
      await api.del(`/api/homebrew/${collectionId}/content/${moveId}`);
    }
  },

  updateDataswornMoves: (homebrewId) => {
    const homebrewCollection = getState().homebrew.collections[homebrewId];
    const moveCategories = homebrewCollection?.moveCategories?.data;
    const moves = homebrewCollection?.moves?.data;
    if (moveCategories && moves) {
      const categories = convertStoredMovesToCategories(
        homebrewId,
        moveCategories,
        moves
      );
      set((store) => {
        store.homebrew.collections[homebrewId].dataswornMoves = categories;
      });
      getState().rules.rebuildMoves();
    }
  },

  createAssetCollection: async (assetCollection) => {
    await api.post(
      `/api/homebrew/${(assetCollection as any).collectionId}/content`,
      { contentType: "assetCollection", dataJson: assetCollection }
    );
  },
  updateAssetCollection: async (assetCollectionId, assetCollection) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      assetCollectionId,
      "assetCollections"
    );
    if (collectionId) {
      await api.patch(
        `/api/homebrew/${collectionId}/content/${assetCollectionId}`,
        { dataJson: assetCollection }
      );
    }
  },
  deleteAssetCollection: async (homebrewId, assetCollectionId) => {
    const assets =
      getState().homebrew.collections[homebrewId]?.assets?.data ?? {};
    const filteredAssetIds = Object.keys(assets).filter(
      (id) => (assets[id] as any)?.categoryKey === assetCollectionId
    );
    await Promise.all(
      filteredAssetIds.map((id) => getState().homebrew.deleteAsset(id))
    );
    await api.del(`/api/homebrew/${homebrewId}/content/${assetCollectionId}`);
  },

  createAsset: async (asset) => {
    await api.post(`/api/homebrew/${(asset as any).collectionId}/content`, {
      contentType: "asset",
      dataJson: asset,
    });
  },
  updateAsset: async (assetId, asset) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      assetId,
      "assets"
    );
    if (collectionId) {
      await api.patch(`/api/homebrew/${collectionId}/content/${assetId}`, {
        dataJson: asset,
      });
    }
  },
  deleteAsset: async (assetId) => {
    const collectionId = findContentCollectionId(
      getState().homebrew.collections,
      assetId,
      "assets"
    );
    if (collectionId) {
      await api.del(`/api/homebrew/${collectionId}/content/${assetId}`);
    }
  },

  updateDataswornAssets: (homebrewId) => {
    const homebrewCollection = getState().homebrew.collections[homebrewId];
    const assetCollections = homebrewCollection?.assetCollections?.data;
    const assets = homebrewCollection?.assets?.data;
    if (assetCollections && assets) {
      const collections = convertHomebrewAssetDocumentsToCollections(
        homebrewId,
        assetCollections,
        assets
      );
      set((store) => {
        store.homebrew.collections[homebrewId].dataswornAssets = collections;
      });
      getState().rules.rebuildAssets();
    }
  },
});
