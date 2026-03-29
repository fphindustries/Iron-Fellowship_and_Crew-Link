import { useStore } from "stores/store";
import { NarrativeGameContext } from "types/aiGuide.types";

const CUSTOM_TRUTH_INDEX = -1;

export function useAIGuideContext(): NarrativeGameContext {
  const characterName = useStore(
    (store) =>
      store.characters.currentCharacter.currentCharacter?.name ?? "Unknown"
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

  return {
    characterName,
    worldTruths,
    characterAssets,
    campaignCharacterNames,
    recentEvents: [],
  };
}
