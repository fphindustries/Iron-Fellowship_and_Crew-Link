import { useMemo } from "react";
import { useStore } from "stores/store";
import { CombatDocument, CombatEnemy, CombatPosition } from "types/combat.types";
import {
  Difficulty,
  ProgressTrack,
  TrackStatus,
  TrackTypes,
} from "types/Track.type";
import { ROLL_RESULT } from "types/DieRolls.type";
import { getDifficultyStep } from "functions/moveUtils";
import { useActiveCombatQuery } from "hooks/queries/useCombatQuery";
import { api } from "config/api.config";
import { useQueryClient } from "@tanstack/react-query";
import { combatKeys } from "hooks/queries/useCombatQuery";
import {
  useCreateCharacterTrackMutation,
  useUpdateCharacterTrackMutation,
} from "hooks/queries/useCharactersQuery";
import {
  useCreateCampaignTrackMutation,
  useUpdateCampaignTrackMutation,
} from "hooks/queries/useCampaignsQuery";

export function useCombatTracker() {
  const qc = useQueryClient();

  const characterId = useStore(
    (s) => s.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (s) =>
      s.characters.currentCharacter.currentCharacter?.campaignId ?? undefined
  );
  const sessionId = useStore((s) => s.sessionLog.activeSessionId);
  const logCombatStartEvent = useStore(
    (s) => s.sessionLog.logCombatStartEvent
  );
  const logCombatEndEvent = useStore((s) => s.sessionLog.logCombatEndEvent);

  const updateCharacterTrack = useUpdateCharacterTrackMutation(
    characterId ?? undefined
  );
  const updateCampaignTrack = useUpdateCampaignTrackMutation(campaignId);
  const createCharacterTrack = useCreateCharacterTrackMutation(
    characterId ?? undefined
  );
  const createCampaignTrack = useCreateCampaignTrackMutation(campaignId);

  const characterFrayTracks = useStore(
    (s) =>
      s.characters.currentCharacter.tracks.trackMap[TrackStatus.Active][
        TrackTypes.Fray
      ]
  );
  const campaignFrayTracks = useStore(
    (s) =>
      s.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active][
        TrackTypes.Fray
      ]
  );

  const { data: activeCombatRaw, isLoading: loading } = useActiveCombatQuery({
    characterId: campaignId ? undefined : characterId ?? undefined,
    campaignId,
  });

  const activeCombat = useMemo((): (CombatDocument & { id: string }) | null => {
    if (!activeCombatRaw) return null;
    return {
      ...activeCombatRaw.dataJson,
      id: activeCombatRaw.id,
      active: activeCombatRaw.active,
      createdAt: activeCombatRaw.createdAt
        ? new Date(activeCombatRaw.createdAt)
        : new Date(),
    };
  }, [activeCombatRaw]);

  const frayTrack = useMemo((): (ProgressTrack & { id: string }) | null => {
    if (!activeCombat?.trackId) return null;
    const { trackId } = activeCombat;
    if (campaignId && campaignFrayTracks?.[trackId]) {
      return { ...campaignFrayTracks[trackId], id: trackId };
    }
    if (characterFrayTracks?.[trackId]) {
      return { ...characterFrayTracks[trackId], id: trackId };
    }
    return null;
  }, [activeCombat, campaignId, campaignFrayTracks, characterFrayTracks]);

  const invalidateCombat = () => {
    qc.invalidateQueries({
      queryKey: combatKeys.active({
        characterId: campaignId ? undefined : characterId ?? undefined,
        campaignId,
      }),
    });
  };

  const startCombat = async (
    objective: string,
    enemies: CombatEnemy[],
    position: CombatPosition,
    difficulty: Difficulty
  ): Promise<void> => {
    if (!characterId) return;

    // Create the Fray progress track via REST
    const frayTrackData: ProgressTrack = {
      label: objective || "Combat",
      type: TrackTypes.Fray,
      difficulty,
      value: 0,
      status: TrackStatus.Active,
      createdDate: new Date(),
    };
    let trackId: string | undefined;
    if (campaignId) {
      const row = await createCampaignTrack.mutateAsync({
        type: frayTrackData.type,
        dataJson: frayTrackData,
      });
      trackId = (row as any)?.id;
    } else {
      const row = await createCharacterTrack.mutateAsync({
        type: frayTrackData.type,
        dataJson: frayTrackData,
      });
      trackId = (row as any)?.id;
    }

    const combatData = {
      objective,
      enemies,
      position,
      difficulty,
      trackId,
      characterId,
      sessionId,
    };
    if (campaignId) {
      await api.post(`/api/campaigns/${campaignId}/combat`, combatData);
    } else {
      await api.post(`/api/characters/${characterId}/combat`, combatData);
    }
    invalidateCombat();

    logCombatStartEvent({
      objective,
      enemies: enemies.map((e) => e.name),
      position,
    });
  };

  const patchCombat = async (patch: object) => {
    if (!activeCombatRaw || !characterId) return;
    const newDataJson = { ...(activeCombatRaw.dataJson ?? {}), ...patch };
    if (campaignId) {
      await api.patch(
        `/api/campaigns/${campaignId}/combat/${activeCombatRaw.id}`,
        newDataJson
      );
    } else {
      await api.patch(
        `/api/characters/${characterId}/combat/${activeCombatRaw.id}`,
        newDataJson
      );
    }
    invalidateCombat();
  };

  const setPosition = (position: CombatPosition) => patchCombat({ position });

  const addEnemy = (enemy: CombatEnemy) => {
    const enemies = [...(activeCombat?.enemies ?? []), enemy];
    return patchCombat({ enemies });
  };

  const removeEnemy = (index: number) => {
    const enemies = (activeCombat?.enemies ?? []).filter((_, i) => i !== index);
    return patchCombat({ enemies });
  };

  const markCombatProgress = async (times: 1 | 2 = 1): Promise<void> => {
    if (!frayTrack || !characterId) return;
    const step = getDifficultyStep(frayTrack.difficulty) * times;
    const newValue = Math.min(40, frayTrack.value + step);
    if (campaignId) {
      await updateCampaignTrack.mutateAsync({
        trackId: frayTrack.id,
        dataJson: { value: newValue },
      });
    } else {
      await updateCharacterTrack.mutateAsync({
        trackId: frayTrack.id,
        dataJson: { value: newValue },
      });
    }
  };

  const endCombat = async (
    outcome: ROLL_RESULT,
    description?: string
  ): Promise<void> => {
    if (!activeCombatRaw || !characterId) return;

    if (activeCombat?.trackId) {
      if (campaignId) {
        await updateCampaignTrack.mutateAsync({
          trackId: activeCombat.trackId,
          remove: true,
        });
      } else {
        await updateCharacterTrack.mutateAsync({
          trackId: activeCombat.trackId,
          remove: true,
        });
      }
    }

    if (campaignId) {
      await api.del(
        `/api/campaigns/${campaignId}/combat/${activeCombatRaw.id}`
      );
    } else {
      await api.del(
        `/api/characters/${characterId}/combat/${activeCombatRaw.id}`
      );
    }
    invalidateCombat();
    logCombatEndEvent({ outcome, description });
  };

  return {
    activeCombat,
    frayTrack,
    loading,
    startCombat,
    setPosition,
    addEnemy,
    removeEnemy,
    markCombatProgress,
    endCombat,
  };
}
