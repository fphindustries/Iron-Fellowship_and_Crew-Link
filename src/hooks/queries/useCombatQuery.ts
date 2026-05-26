import { useQuery } from "@tanstack/react-query";
import { api } from "config/api.config";

export const combatKeys = {
  active: (params: { characterId?: string; campaignId?: string }) =>
    ["combat", "active", params] as const,
};

export function useActiveCombatQuery(params: {
  characterId?: string;
  campaignId?: string;
}) {
  const { characterId, campaignId } = params;
  return useQuery({
    queryKey: combatKeys.active(params),
    queryFn: () => {
      if (campaignId) {
        return api.get<any>(`/api/campaigns/${campaignId}/combat/active`);
      }
      return api.get<any>(`/api/characters/${characterId}/combat/active`);
    },
    enabled: !!(characterId || campaignId),
  });
}
