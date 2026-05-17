import { CreateSliceType } from "stores/store.type";
import { CharacterSlice } from "./character.slice.type";
import { defaultCharacterSlice } from "./character.slice.default";
import { getErrorMessage } from "functions/getErrorMessage";
import { createCurrentCharacterSlice } from "./currentCharacter/currentCharacter.slice";
import { momentumTrack } from "data/defaultTracks";
import { api } from "config/api.config";
import { getImageUrl, uploadImage } from "lib/storage.lib";

function toCharacterDocument(row: any): any {
  return {
    uid: row.userId,
    name: row.name,
    campaignId: row.campaignId ?? null,
    worldId: row.worldId ?? null,
    stats: row.statsJson ?? {},
    conditionMeters: row.conditionMetersJson ?? {},
    momentum: row.momentum ?? 2,
    specialTracks: row.specialTracksJson ?? {},
    experience: row.experienceJson ?? {},
    debilities: row.debilitiesJson ?? {},
    profileImage: row.profileImage ?? null,
    expansionIds: row.expansionIds ?? [],
    customTracks: row.customTracksJson ?? {},
    theme: row.theme ?? undefined,
    backstory: row.backstory ?? undefined,
    initiativeStatus: row.initiativeStatus ?? "outOfCombat",
  };
}

export const createCharacterSlice: CreateSliceType<CharacterSlice> = (
  ...params
) => {
  const [set, getState] = params;
  return {
    ...defaultCharacterSlice,

    currentCharacter: createCurrentCharacterSlice(...params),

    subscribe: (uid?: string) => {
      if (!uid) return undefined;

      let active = true;

      api
        .get<any[]>(`/api/characters?uid=${uid}`)
        .then((rows) => {
          if (!active) return;
          set((store) => {
            rows.forEach((row) => {
              store.characters.characterMap[row.id] = toCharacterDocument(row);
            });
            store.characters.loading = false;
          });
        })
        .catch((e) => {
          if (!active) return;
          set((store) => {
            store.characters.error = getErrorMessage(e, "Failed to load your characters.");
            store.characters.loading = false;
          });
        });

      return () => {
        active = false;
      };
    },

    loadCharacterPortrait: (uid, characterId, filename) => {
      const existingFilename =
        getState().characters.characterPortraitMap[characterId]?.filename;

      if (!filename) {
        set((state) => {
          delete state.characters.characterPortraitMap[characterId];
        });
      } else if (existingFilename !== filename) {
        set((state) => {
          state.characters.characterPortraitMap[characterId] = {
            loading: true,
            filename: filename,
          };
        });
        getImageUrl(`characters/${uid}/characters/${characterId}/${filename}`)
          .then((url) => {
            set((state) => {
              state.characters.characterPortraitMap[characterId] = {
                loading: false,
                filename: filename,
                url,
              };
            });
          })
          .catch(() => {
            set((state) => {
              state.characters.characterPortraitMap[characterId] = {
                loading: false,
                filename: filename,
              };
            });
          });
      }
    },

    createCharacter: async (name, stats, assets, portrait, expansionIds, backstory, backgroundVow) => {
      const uid = getState().auth.user?.id;
      if (!uid) throw new Error("You must be logged in to create a character");

      const char = await api.post<any>("/api/characters", {
        name,
        system: "starforged",
        statsJson: stats,
        expansionIds: expansionIds ?? [],
        backstory: backstory ?? null,
      });

      const postCreation: Promise<unknown>[] = [];

      if (assets && assets.length > 0) {
        assets.forEach((asset) => {
          postCreation.push(api.post(`/api/characters/${char.id}/assets`, asset));
        });
      }

      if (backgroundVow) {
        postCreation.push(
          api.post(`/api/characters/${char.id}/tracks`, {
            type: "vow",
            dataJson: {
              label: backgroundVow,
              difficulty: "epic",
              value: 0,
              status: "active",
            },
          })
        );
      }

      await Promise.all(postCreation);

      if (portrait && portrait.image instanceof File) {
        const portraitPath = `characters/${uid}/characters/${char.id}`;
        await uploadImage(portraitPath, portrait.image);
        await api.patch(`/api/characters/${char.id}`, { profileImage: portrait.image.name });
      }

      return char.id;
    },

    deleteCharacter: async (characterId) => {
      await api.del(`/api/characters/${characterId}`);
      set((store) => {
        delete store.characters.characterMap[characterId];
      });
    },
  };
};
