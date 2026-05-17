import { CreateSliceType } from "stores/store.type";
import { AccessibilitySettingsSlice } from "./accessibilitySettings.slice.type";
import { defaultAccessibilitySettingsSlice } from "./accessibilitySettings.slice.default";
import { api } from "config/api.config";

export const createAccessibilitySettingsSlice: CreateSliceType<
  AccessibilitySettingsSlice
> = (set, getState) => ({
  ...defaultAccessibilitySettingsSlice,

  listenToSettings: (uid) => {
    let active = true;

    api.get<any>("/api/settings/accessibility").then((row) => {
      if (!active) return;
      set((store) => {
        store.accessibilitySettings.settings = row?.dataJson ?? {};
      });
    }).catch(console.error);

    return () => { active = false; };
  },

  updateSettings: async (settings) => {
    const uid = getState().auth.user?.id;
    if (!uid) return;
    await api.patch("/api/settings/accessibility", settings);
    set((store) => {
      store.accessibilitySettings.settings = settings as any;
    });
  },
});
