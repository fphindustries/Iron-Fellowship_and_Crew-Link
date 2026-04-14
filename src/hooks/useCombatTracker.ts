import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "config/supabase.config";
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
import { createCombat } from "api-calls/combat/createCombat";
import { updateCombat } from "api-calls/combat/updateCombat";
import { endCombat as endCombatApi } from "api-calls/combat/endCombat";
import { listenToActiveCombat } from "api-calls/combat/listenToActiveCombat";
import {
  convertToRow,
  CHARACTER_TRACKS_TABLE,
  CAMPAIGN_TRACKS_TABLE,
} from "api-calls/tracks/_getRef";

export function useCombatTracker() {
  const [activeCombat, setActiveCombat] = useState<
    (CombatDocument & { id: string }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

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


  const updateCharacterTrack = useStore(
    (s) => s.characters.currentCharacter.tracks.updateTrack
  );
  const updateCampaignTrack = useStore(
    (s) => s.campaigns.currentCampaign.tracks.updateTrack
  );
  const deleteCharacterTrack = useStore(
    (s) => s.characters.currentCharacter.tracks.deleteTrack
  );
  const deleteCampaignTrack = useStore(
    (s) => s.campaigns.currentCampaign.tracks.deleteTrack
  );

  // Read the fray track from the store by trackId
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

  const frayTrack = useMemo((): (ProgressTrack & { id: string }) | null => {
    if (!activeCombat?.trackId) return null;
    const { trackId } = activeCombat;
    // Campaign track takes priority if in a campaign
    if (campaignId && campaignFrayTracks?.[trackId]) {
      return { ...campaignFrayTracks[trackId], id: trackId };
    }
    if (characterFrayTracks?.[trackId]) {
      return { ...characterFrayTracks[trackId], id: trackId };
    }
    return null;
  }, [activeCombat, campaignId, campaignFrayTracks, characterFrayTracks]);

  useEffect(() => {
    if (!characterId) {
      setActiveCombat(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = listenToActiveCombat(
      characterId,
      (combat) => {
        setActiveCombat(combat);
        setLoading(false);
      },
      campaignId
    );
    unsubscribeRef.current = unsub;
    return () => {
      unsub();
      unsubscribeRef.current = null;
    };
  }, [characterId, campaignId]);

  const startCombat = async (
    objective: string,
    enemies: CombatEnemy[],
    position: CombatPosition,
    difficulty: Difficulty
  ): Promise<void> => {
    if (!characterId || !sessionId) return;

    // Create the Fray progress track and get its ID
    const frayTrackData: Omit<ProgressTrack, "createdDate"> = {
      label: objective || "Combat",
      type: TrackTypes.Fray,
      difficulty,
      value: 0,
      status: TrackStatus.Active,
    };
    const trackRow = convertToRow({
      ...frayTrackData,
      createdDate: new Date(),
    });

    const table = campaignId ? CAMPAIGN_TRACKS_TABLE : CHARACTER_TRACKS_TABLE;
    const parentIdCol = campaignId ? "campaign_id" : "character_id";
    const parentId = campaignId ?? characterId;

    const { data: trackData, error: trackError } = await supabase
      .from(table)
      .insert({ ...trackRow, [parentIdCol]: parentId } as any)
      .select("id")
      .single();

    if (trackError) throw trackError;
    const trackId = trackData.id;

    await createCombat({
      characterId,
      campaignId,
      sessionId,
      objective,
      enemies,
      position,
      difficulty,
      trackId,
    });

    logCombatStartEvent({
      objective,
      enemies: enemies.map((e) => e.name),
      position,
    });
  };

  const setPosition = async (position: CombatPosition): Promise<void> => {
    if (!activeCombat || !characterId) return;
    await updateCombat(activeCombat.id, characterId, { position }, campaignId);
  };

  const addEnemy = async (enemy: CombatEnemy): Promise<void> => {
    if (!activeCombat || !characterId) return;
    const enemies = [...activeCombat.enemies, enemy];
    await updateCombat(activeCombat.id, characterId, { enemies }, campaignId);
  };

  const removeEnemy = async (index: number): Promise<void> => {
    if (!activeCombat || !characterId) return;
    const enemies = activeCombat.enemies.filter((_, i) => i !== index);
    await updateCombat(activeCombat.id, characterId, { enemies }, campaignId);
  };

  /**
   * Mark combat progress `times` times (usually 1 or 2) per the fray track difficulty.
   */
  const markCombatProgress = async (times: 1 | 2 = 1): Promise<void> => {
    if (!frayTrack || !characterId) return;
    const step = getDifficultyStep(frayTrack.difficulty) * times;
    const newValue = Math.min(40, frayTrack.value + step);
    if (campaignId) {
      await updateCampaignTrack(frayTrack.id, { value: newValue });
    } else {
      await updateCharacterTrack(frayTrack.id, { value: newValue });
    }
  };

  const endCombat = async (
    outcome: ROLL_RESULT,
    description?: string
  ): Promise<void> => {
    if (!activeCombat || !characterId) return;

    // Delete the fray track
    if (activeCombat.trackId) {
      if (campaignId) {
        await deleteCampaignTrack(activeCombat.trackId);
      } else {
        await deleteCharacterTrack(activeCombat.trackId);
      }
    }

    await endCombatApi(activeCombat.id, characterId, campaignId);
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
