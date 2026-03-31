import { useStore } from "stores/store";
import { NarrativeGameContext } from "types/aiGuide.types";
import { SESSION_EVENT_TYPE, SessionLogEvent } from "types/SessionLog.type";

const CUSTOM_TRUTH_INDEX = -1;
const MAX_RECENT_EVENTS = 10;

function formatEvent(event: SessionLogEvent): string {
  switch (event.type) {
    case SESSION_EVENT_TYPE.MOVE: {
      const parts: string[] = [`[Move: ${event.moveName}]`];
      if (event.playerContext) parts.push(`"${event.playerContext}"`);
      if (event.outcome !== undefined) {
        const outcomeLabel =
          event.outcome === 0
            ? "Strong Hit"
            : event.outcome === 1
            ? "Weak Hit"
            : "Miss";
        parts.push(`Outcome: ${outcomeLabel}`);
      }
      if (event.narrative) parts.push(`Narrative: "${event.narrative}"`);
      return parts.join(" — ");
    }
    case SESSION_EVENT_TYPE.JOURNAL:
      return event.isAiGenerated
        ? `[Guide] ${event.text}`
        : `[Note] "${event.text}"`;
    case SESSION_EVENT_TYPE.ORACLE:
      return `[Oracle: ${event.oracleName}] ${event.result}`;
    case SESSION_EVENT_TYPE.STAT_CHANGE:
      return `[${event.stat}: ${event.previousValue} → ${event.newValue}${event.cause ? ` (${event.cause})` : ""}]`;
    case SESSION_EVENT_TYPE.PROGRESS:
      return `[Progress: ${event.trackName} ${event.previousValue} → ${event.newValue}]`;
    default:
      return "";
  }
}

export function useAIGuideContext(): NarrativeGameContext {
  const characterName = useStore(
    (store) =>
      store.characters.currentCharacter.currentCharacter?.name ?? "Unknown"
  );

  const characterPronouns = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.pronouns
  );

  const callsign = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.callsign
  );

  const characteristics = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.characteristics
  );

  const worldTruths = useStore((store) => {
    const world = store.worlds.currentWorld.currentWorld;
    const truthDefinitions = store.rules.worldTruths;
    if (!world?.newTruths) return [];

    const results: string[] = [];
    Object.keys(truthDefinitions).forEach((key) => {
      const selection = world.newTruths?.[key];
      if (!selection) return;
      const truth = truthDefinitions[key];
      if (!truth) return;

      let description: string;
      if (selection.selectedTruthOptionIndex === CUSTOM_TRUTH_INDEX) {
        description = selection.customTruth?.description ?? "";
      } else {
        const optionIndex = selection.selectedTruthOptionIndex ?? 0;
        const option = truth.options[optionIndex];
        if (!option) return;
        description = option.description;
      }
      if (description) {
        results.push(`${truth.name}: ${description}`);
      }
    });
    return results;
  });

  const characterAssets = useStore((store) => {
    const storedAssets = store.characters.currentCharacter.assets.assets ?? {};
    const assetMap = store.rules.assetMaps.assetMap;
    return Object.values(storedAssets)
      .map((a) => assetMap[a.id]?.name)
      .filter((name): name is string => !!name);
  });

  const campaignCharacterNames = useStore((store) => {
    const characterMap =
      store.campaigns.currentCampaign.characters.characterMap;
    const currentId = store.characters.currentCharacter.currentCharacterId;
    const names = Object.entries(characterMap)
      .filter(([id]) => id !== currentId)
      .map(([, c]) => c.name);
    return names.length > 0 ? names : undefined;
  });

  const previousSessionSummary = useStore(
    (store) => store.sessionLog.mostRecentPastSession?.summary
  );

  const recentEvents = useStore((store) => {
    const events = store.sessionLog.events;
    return Object.values(events)
      .filter(
        (e) =>
          e.type !== SESSION_EVENT_TYPE.STAT_CHANGE &&
          e.type !== SESSION_EVENT_TYPE.PROGRESS
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-MAX_RECENT_EVENTS)
      .map(formatEvent)
      .filter(Boolean);
  });

  return {
    characterName,
    worldTruths,
    characterAssets,
    campaignCharacterNames,
    recentEvents,
    previousSessionSummary,
    characterPronouns,
    callsign,
    characteristics,
  };
}
