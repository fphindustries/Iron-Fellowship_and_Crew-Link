import { useStore } from "stores/store";
import { CampaignType } from "types/Campaign.type";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { AiCampaignContext, AiGuideStateContext } from "types/AI.type";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { SESSION_EVENT_TYPE, MoveSessionEvent } from "types/SessionLog.type";
import { ROLL_RESULT } from "types/DieRolls.type";

export function buildBaseCampaignContext(
  gameSystem: GAME_SYSTEMS,
  store: ReturnType<typeof useStore.getState>,
  freeformInput?: string
): AiCampaignContext {
  const campaign = store.campaigns.currentCampaign.currentCampaign;
  const character = store.characters.currentCharacter.currentCharacter;
  const trackMap =
    store.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active];

  const activeVows = Object.values(trackMap?.[TrackTypes.Vow] ?? {}).map(
    (v) => ({ label: v.label, difficulty: v.difficulty, value: v.value })
  );
  const activeJourneys = Object.values(
    trackMap?.[TrackTypes.Journey] ?? {}
  ).map((j) => ({ label: j.label, difficulty: j.difficulty, value: j.value }));

  const characters = character
    ? [
        {
          name: character.name,
          stats: character.stats ?? {},
          conditionMeters: character.conditionMeters ?? {},
          momentum: character.momentum ?? 0,
        },
      ]
    : [];

  const recentRolls = Object.values(store.sessionLog.events)
    .filter((e) => e.type === SESSION_EVENT_TYPE.MOVE)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10)
    .map((e) => {
      const m = e as MoveSessionEvent;
      const result =
        m.outcome === ROLL_RESULT.HIT
          ? "hit"
          : m.outcome === ROLL_RESULT.WEAK_HIT
          ? "weakHit"
          : "miss";
      return { label: m.moveName, result: result as "hit" | "weakHit" | "miss" };
    });

  return {
    gameSystem: gameSystem === GAME_SYSTEMS.STARFORGED ? "starforged" : "ironsworn",
    campaignName: campaign?.name ?? "Unknown Campaign",
    campaignType: (campaign?.type ?? CampaignType.AIGuided) as "ai-guided",
    activeVows,
    activeJourneys,
    characters,
    recentRolls,
    freeformInput,
  };
}

export function buildGuideStateContext(
  store: ReturnType<typeof useStore.getState>
): AiGuideStateContext | undefined {
  const guideState = store.aiGuide.state;
  if (!guideState) return undefined;

  return {
    currentScene: guideState.currentScene,
    canonFacts: Array.from(
      new Set([
        ...guideState.canonFacts,
        ...guideState.canonLedger
          .filter((f) => f.status === "confirmed")
          .map((f) => f.text),
      ])
    ),
    npcIntents: Object.fromEntries(
      Object.entries(guideState.npcIntents).map(([name, intent]) => [
        name,
        {
          currentIntent: intent.currentIntent,
          hiddenAspects: intent.hiddenAspects,
          firstImpressionRevealed: intent.firstImpressionRevealed,
        },
      ])
    ),
    tensionClocks: guideState.tensionClocks.map((c) => ({
      label: c.label,
      segments: c.segments,
      filled: c.filled,
      consequence: c.consequence,
    })),
    sceneChallengeState: guideState.sceneChallengeState,
    spotlight: guideState.spotlight,
  };
}
