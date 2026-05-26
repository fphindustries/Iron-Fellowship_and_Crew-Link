import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "stores/store";
import { useSocketRoom } from "./useSocketRoom";
import { characterKeys } from "./queries/useCharactersQuery";
import { campaignKeys } from "./queries/useCampaignsQuery";
import { worldKeys } from "./queries/useWorldsQuery";
import { sessionLogKeys } from "./queries/useSessionLogQuery";
import { combatKeys } from "./queries/useCombatQuery";

export function useSocketInvalidation() {
  useCharacterSocketInvalidation();
  useCampaignSocketInvalidation();
  useWorldSocketInvalidation();
}

function useCharacterSocketInvalidation() {
  const qc = useQueryClient();
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId ?? ""
  );

  useSocketRoom("character", characterId, {
    updated: () => {
      if (!characterId) return;
      qc.invalidateQueries({ queryKey: characterKeys.detail(characterId) });
      qc.invalidateQueries({ queryKey: characterKeys.assets(characterId) });
      qc.invalidateQueries({ queryKey: characterKeys.tracks(characterId) });
      qc.invalidateQueries({
        queryKey: sessionLogKeys.active({ characterId }),
      });
      qc.invalidateQueries({
        queryKey: sessionLogKeys.list("character", characterId),
      });
      qc.invalidateQueries({ queryKey: combatKeys.active({ characterId }) });
    },
  });
}

function useCampaignSocketInvalidation() {
  const qc = useQueryClient();
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId ?? ""
  );

  useSocketRoom("campaign", campaignId, {
    updated: () => {
      if (!campaignId) return;
      qc.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.assets(campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.tracks(campaignId) });
      qc.invalidateQueries({
        queryKey: sessionLogKeys.active({ campaignId }),
      });
      qc.invalidateQueries({
        queryKey: sessionLogKeys.list("campaign", campaignId),
      });
      qc.invalidateQueries({ queryKey: combatKeys.active({ campaignId }) });
    },
  });
}

function useWorldSocketInvalidation() {
  const qc = useQueryClient();
  const worldId = useStore(
    (store) => store.worlds.currentWorld.currentWorldId ?? ""
  );

  useSocketRoom("world", worldId, {
    updated: () => {
      if (!worldId) return;
      qc.invalidateQueries({ queryKey: ["world", worldId] });
      qc.invalidateQueries({ queryKey: worldKeys.detail(worldId) });
    },
  });
}
