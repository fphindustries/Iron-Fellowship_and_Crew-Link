import { Box } from "@mui/material";

import { StatComponent } from "components/features/characters/StatComponent";
import { useUpdateCharacterMutation } from "hooks/queries/useCharactersQuery";
import { useStore } from "stores/store";

export function StatsSectionMobile() {
  const ruleStats = useStore((store) => store.rules.stats);

  const stats = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.stats
  );

  const adds = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.adds ?? 0
  );
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const updateAdds = useUpdateCharacterMutation(characterId ?? "");

  return (
    <Box mt={1} mx={-1}>
      <Box
        display={"flex"}
        alignItems={"center"}
        justifyContent={"center"}
        flexDirection={"row"}
        flexWrap={"wrap"}
        gap={0.5}
      >
        {Object.keys(ruleStats).map((statKey) => (
          <StatComponent
            key={statKey}
            label={ruleStats[statKey].label}
            value={stats?.[statKey] ?? 0}
            sx={{ width: 54 }}
          />
        ))}
        <StatComponent
          label={"Adds"}
          updateTrack={(newValue) => updateAdds.mutateAsync({ adds: newValue })}
          value={adds}
          sx={{ width: 54 }}
        />
      </Box>
    </Box>
  );
}
