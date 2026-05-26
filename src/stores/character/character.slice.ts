import { CreateSliceType } from "stores/store.type";
import { CharacterSlice } from "./character.slice.type";
import { defaultCharacterSlice } from "./character.slice.default";
import { getErrorMessage } from "functions/getErrorMessage";
import { createCurrentCharacterSlice } from "./currentCharacter/currentCharacter.slice";
import { momentumTrack } from "data/defaultTracks";
import { api } from "config/api.config";
import { fileToBase64 } from "lib/storage.lib";

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

    loadCharacterPortrait: (_uid, characterId, url) => {
      if (!url) {
        set((state) => {
          delete state.characters.characterPortraitMap[characterId];
        });
      } else {
        set((state) => {
          state.characters.characterPortraitMap[characterId] = {
            loading: false,
            filename: url,
            url,
          };
        });
      }
    },

    createCharacter: async (name, stats, assets, portrait, expansionIds, backstory, backgroundVow, pronouns, callsign, characteristics, role) => {
      const uid = getState().auth.user?.id;
      if (!uid) throw new Error("You must be logged in to create a character");

      const char = await api.post<any>("/api/characters", {
        name,
        system: "starforged",
        statsJson: stats,
        expansionIds: expansionIds ?? [],
        backstory: backstory ?? null,
        pronouns: pronouns ?? null,
        callsign: callsign ?? null,
        role: role ?? null,
        characteristicsJson: characteristics ?? {},
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
        const url = await fileToBase64(portrait.image);
        await api.patch(`/api/characters/${char.id}`, {
          profileImage: {
            url,
            position: portrait.position ?? { x: 0.5, y: 0.5 },
            scale: portrait.scale ?? 1,
          },
        });
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
