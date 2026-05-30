import { Box, Typography } from "@mui/material";
import { MobileStatTrack } from "pages/Character/CharacterSheetPage/components/MobileStatTrack";
import { useStore } from "stores/store";
import { useUpdateCampaignMutation } from "hooks/queries/useCampaignsQuery";
import { useUpdateCharacterMutation } from "hooks/queries/useCharactersQuery";

export function CharacterConditionMeters() {
  const conditionMeters = useStore((store) => store.rules.conditionMeters);
  const isInCampaign = useStore(
    (store) => !!store.characters.currentCharacter.currentCharacter?.campaignId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const updateCampaign = useUpdateCampaignMutation(campaignId ?? "");
  const updateCharacter = useUpdateCharacterMutation(characterId ?? "");
  const updateConditionMeter = (
    conditionMeterKey: string,
    newValue: number
  ) => {
    const conditionMeter = conditionMeters[conditionMeterKey];

    if (conditionMeter.shared && isInCampaign) {
      return updateCampaign.mutateAsync({
        conditionMetersJson: {
          ...(campaignConditionMeters ?? {}),
          [conditionMeterKey]: newValue,
        },
      });
    } else {
      return updateCharacter.mutateAsync({
        conditionMetersJson: {
          ...(characterConditionMeters ?? {}),
          [conditionMeterKey]: newValue,
        },
      });
    }
  };

  const characterConditionMeters = useStore(
    (store) =>
      store.characters.currentCharacter.currentCharacter?.conditionMeters
  );
  const campaignConditionMeters = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.conditionMeters
  );

  const getConditionMeterValue = (conditionMeterKey: string): number => {
    const conditionMeter = conditionMeters[conditionMeterKey];

    if (conditionMeter.shared && isInCampaign && campaignConditionMeters) {
      return campaignConditionMeters[conditionMeterKey] ?? conditionMeter.value;
    } else if (
      (!conditionMeter.shared || !isInCampaign) &&
      characterConditionMeters
    ) {
      return (
        characterConditionMeters[conditionMeterKey] ?? conditionMeter.value
      );
    }

    return conditionMeter.value;
  };

  return (
    <Box mt={2}>
      <Typography
        fontFamily={(theme) => theme.fontFamilyTitle}
        variant={"h6"}
        color={"text.secondary"}
      >
        Condition Meters
      </Typography>
      <Box display={"flex"} flexWrap={"wrap"} gap={1}>
        {Object.entries(conditionMeters).map(
          ([conditionMeterKey, conditionMeter]) => (
            <MobileStatTrack
              key={conditionMeterKey}
              label={conditionMeter.label}
              value={getConditionMeterValue(conditionMeterKey)}
              onChange={(newValue) =>
                updateConditionMeter(conditionMeterKey, newValue)
              }
              disableRoll={!conditionMeter.rollable}
              min={conditionMeter.min}
              max={conditionMeter.max}
              smallSize
            />
          )
        )}
      </Box>
    </Box>
  );
}
