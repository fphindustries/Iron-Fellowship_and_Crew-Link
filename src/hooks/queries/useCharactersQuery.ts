import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";
import { fileToBase64 } from "lib/storage.lib";
import { AssetDocument } from "types/Asset.type";

export const characterKeys = {
  all: ["characters"] as const,
  list: (uid: string) => ["characters", "list", uid] as const,
  detail: (id: string) => ["characters", "detail", id] as const,
  assets: (id: string) => ["characters", "assets", id] as const,
  tracks: (id: string) => ["characters", "tracks", id] as const,
};

export function useCharactersQuery(uid: string | undefined) {
  return useQuery({
    queryKey: characterKeys.list(uid ?? ""),
    queryFn: () => api.get<any[]>(`/api/characters?uid=${uid}`),
    enabled: !!uid,
  });
}

export function useCharacterQuery(id: string | undefined) {
  return useQuery({
    queryKey: characterKeys.detail(id ?? ""),
    queryFn: () => api.get<any>(`/api/characters/${id}`),
    enabled: !!id,
  });
}

export function useCharacterAssetsQuery(id: string | undefined) {
  return useQuery({
    queryKey: characterKeys.assets(id ?? ""),
    queryFn: () => api.get<any[]>(`/api/characters/${id}/assets`),
    enabled: !!id,
  });
}

export function useCharacterTracksQuery(id: string | undefined) {
  return useQuery({
    queryKey: characterKeys.tracks(id ?? ""),
    queryFn: () => api.get<any[]>(`/api/characters/${id}/tracks`),
    enabled: !!id,
  });
}

export function useCreateCharacterMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.post<any>("/api/characters", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}

export function useCreateFullCharacterMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      stats,
      assets,
      portrait,
      expansionIds,
      backstory,
      backgroundVow,
      pronouns,
      callsign,
      characteristics,
      role,
    }: {
      name: string;
      stats: Record<string, number>;
      assets: AssetDocument[];
      portrait?: {
        image: File | string;
        scale: number;
        position: {
          x: number;
          y: number;
        };
      };
      expansionIds?: string[];
      backstory?: string;
      backgroundVow?: string;
      pronouns?: string;
      callsign?: string;
      characteristics?: string;
      role?: string;
    }) => {
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

      assets.forEach((asset) => {
        postCreation.push(api.post(`/api/characters/${char.id}/assets`, asset));
      });

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

      return char.id as string;
    },
    onSuccess: (characterId) => {
      qc.invalidateQueries({ queryKey: characterKeys.all });
      qc.invalidateQueries({ queryKey: characterKeys.detail(characterId) });
      qc.invalidateQueries({ queryKey: characterKeys.assets(characterId) });
      qc.invalidateQueries({ queryKey: characterKeys.tracks(characterId) });
    },
  });
}

export function useUpdateCharacterMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.patch<any>(`/api/characters/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.detail(id) }),
  });
}

export function useDeleteCharacterMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/characters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}

export function useUpdateCharacterAssetMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      dataJson,
      remove,
    }: {
      assetId?: string;
      dataJson?: object;
      remove?: boolean;
    }) => {
      if (remove && assetId) return api.del<void>(`/api/characters/${id}/assets/${assetId}`);
      if (assetId) return api.patch<void>(`/api/characters/${id}/assets/${assetId}`, dataJson);
      return api.post<void>(`/api/characters/${id}/assets`, dataJson);
    },
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: characterKeys.assets(id) });
    },
  });
}

export function useCreateCharacterTrackMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, dataJson }: { type?: string; dataJson?: object }) =>
      api.post<Record<string, unknown>>(`/api/characters/${id}/tracks`, { type, dataJson }),
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: characterKeys.tracks(id) });
    },
  });
}

export function useUpdateCharacterTrackMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      trackId,
      dataJson,
      remove,
    }: {
      trackId?: string;
      type?: string;
      dataJson?: object;
      remove?: boolean;
    }) => {
      if (remove && trackId) return api.del<void>(`/api/characters/${id}/tracks/${trackId}`);
      if (trackId) return api.patch<void>(`/api/characters/${id}/tracks/${trackId}`, { dataJson });
      return api.post<void>(`/api/characters/${id}/tracks`, { dataJson });
    },
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: characterKeys.tracks(id) });
    },
  });
}
