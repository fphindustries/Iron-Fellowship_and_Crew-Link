import { CreateSliceType } from "stores/store.type";
import { CurrentCharacterSlice } from "./currentCharacter.slice.type";
import { defaultCurrentCharacterSlice } from "./currentCharacter.slice.default";
import { createAssetsSlice } from "./assets/assets.slice";
import { createCharacterTracksSlice } from "./tracks/characterTracks.slice";
import { api } from "config/api.config";
import { deleteImage, uploadImage } from "lib/storage.lib";

function constructCharacterPortraitFolderPath(uid: string, characterId: string) {
  return `/characters/${uid}/characters/${characterId}`;
}

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
      const uid = state.auth.user?.id;
      const characterId = state.characters.currentCharacter.currentCharacterId;
      if (!uid || !characterId) return Promise.reject("Character ID or UserID were not defined");

      const folderPath = constructCharacterPortraitFolderPath(uid, characterId);
      const oldFilename = state.characters.currentCharacter.currentCharacter?.profileImage?.filename;

      if (portrait) {
        if (oldFilename) {
          await deleteImage(folderPath, oldFilename).catch(() => {});
        }
        await uploadImage(folderPath, portrait);
        await api.patch<void>(`/api/characters/${characterId}`, {
          profileImage: { filename: portrait.name, position, scale },
        });
      } else {
        await api.patch<void>(`/api/characters/${characterId}`, {
          profileImage: { filename: oldFilename, position, scale },
        });
      }
    },

    removeCurrentCharacterPortrait: async () => {
      const state = getState();
      const uid = state.auth.user?.id;
      const characterId = state.characters.currentCharacter.currentCharacterId;
      const oldFilename = state.characters.currentCharacter.currentCharacter?.profileImage?.filename;
      if (!uid || !characterId) return Promise.reject("Character ID or UserID were not defined");
      if (!oldFilename) return Promise.reject("We could not find your old portrait");

      const folderPath = constructCharacterPortraitFolderPath(uid, characterId);
      await deleteImage(folderPath, oldFilename);
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
