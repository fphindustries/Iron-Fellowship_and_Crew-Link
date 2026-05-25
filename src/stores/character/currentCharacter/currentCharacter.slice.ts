import { CreateSliceType } from "stores/store.type";
import { CurrentCharacterSlice } from "./currentCharacter.slice.type";
import { defaultCurrentCharacterSlice } from "./currentCharacter.slice.default";
import { createAssetsSlice } from "./assets/assets.slice";
import { createCharacterTracksSlice } from "./tracks/characterTracks.slice";
import { api } from "config/api.config";
import { fileToBase64 } from "lib/storage.lib";

export const createCurrentCharacterSlice: CreateSliceType<
  CurrentCharacterSlice
> = (...params) => {
  const [set, getState] = params;
  return {
    ...defaultCurrentCharacterSlice,

    assets: createAssetsSlice(...params),
    tracks: createCharacterTracksSlice(...params),

    setCurrentCharacterId: (characterId) => {
      set((store) => {
        store.characters.currentCharacter.currentCharacterId = characterId;
        store.characters.currentCharacter.currentCharacter = characterId
          ? store.characters.characterMap[characterId]
          : undefined;
      });
    },

    updateCurrentCharacter: (character) => {
      const characterId = getState().characters.currentCharacter.currentCharacterId;
      if (!characterId) return Promise.reject("Character ID must be defined");
      return api.patch<void>(`/api/characters/${characterId}`, character);
    },

    updateCharacterConditionMeter: (conditionMeterKey, value) => {
      const characterId = getState().characters.currentCharacter.currentCharacterId;
      if (!characterId) return Promise.reject("Character ID must be defined");
      const existing = getState().characters.currentCharacter.currentCharacter;
      const conditionMeters = { ...(existing?.conditionMeters ?? {}), [conditionMeterKey]: value };
      return api.patch<void>(`/api/characters/${characterId}`, { conditionMeters });
    },

    updateCurrentCharacterPortrait: async (portrait, scale, position) => {
      const state = getState();
      const characterId = state.characters.currentCharacter.currentCharacterId;
      if (!characterId) return Promise.reject("Character ID was not defined");

      if (portrait) {
        const url = await fileToBase64(portrait);
        await api.patch<void>(`/api/characters/${characterId}`, {
          profileImage: { url, position, scale },
        });
      } else {
        const existingUrl = state.characters.currentCharacter.currentCharacter?.profileImage?.url;
        await api.patch<void>(`/api/characters/${characterId}`, {
          profileImage: { url: existingUrl, position, scale },
        });
      }
    },

    removeCurrentCharacterPortrait: async () => {
      const state = getState();
      const characterId = state.characters.currentCharacter.currentCharacterId;
      if (!characterId) return Promise.reject("Character ID was not defined");
      await api.patch<void>(`/api/characters/${characterId}`, { profileImage: null });
    },

    resetStore: () => {
      set((store) => {
        store.characters.currentCharacter = {
          ...store.characters.currentCharacter,
          ...defaultCurrentCharacterSlice,
        };
      });

      const state = getState();
      state.characters.currentCharacter.assets.resetStore();
      state.characters.currentCharacter.tracks.resetStore();
      state.notes.resetStore();
      state.gameLog.resetStore();
    },
  };
};
