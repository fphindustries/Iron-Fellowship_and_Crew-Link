import { CreateSliceType } from "stores/store.type";
import { SettingsSlice } from "./settings.slice.type";
import { defaultSettings } from "./settings.slice.default";
import { api } from "config/api.config";

export const createSettingsSlice: CreateSliceType<SettingsSlice> = () => ({
  ...defaultSettings,

  addCustomMove: async (customMove) => {
    await api.post("/api/settings/custom-moves", customMove);
  },
  updateCustomMove: async (moveId, customMove) => {
    await api.patch(`/api/settings/custom-moves/${moveId}`, customMove);
  },
  removeCustomMove: async (moveId) => {
    await api.del(`/api/settings/custom-moves/${moveId}`);
  },

  addCustomOracle: async (customOracle) => {
    await api.post("/api/settings/custom-oracles", customOracle);
  },
  updateCustomOracle: async (oracleId, customOracle) => {
    await api.patch(`/api/settings/custom-oracles/${oracleId}`, customOracle);
  },
  removeCustomOracle: async (oracleId) => {
    await api.del(`/api/settings/custom-oracles/${oracleId}`);
  },
});
