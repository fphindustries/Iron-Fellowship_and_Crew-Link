import { Box, Stack } from "@mui/material";
import { SectionHeading } from "components/shared/SectionHeading";
import { useGameSystem } from "hooks/useGameSystem";
import { useStore } from "stores/store";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { ExperienceTrack } from "./ExperienceTrack";
import { ProgressTrack } from "components/features/ProgressTrack";
import { LegacyTrack as ILegacyTrack } from "types/LegacyTrack.type";
import { LegacyTrack } from "./LegacyTrack";
import { useUpdateCharacterMutation } from "hooks/queries/useCharactersQuery";
import { useUpdateCampaignMutation } from "hooks/queries/useCampaignsQuery";

export function SpecialTracks() {
  const specialTracksRules = useStore((store) => store.rules.specialTracks);

  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const isInCampaign = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.campaignId
  );
  const specialTracksCharacterValues = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.specialTracks
  );
  const specialTracksCampaignValues = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.specialTracks
  );

  const getSpecialTrackValue = (
    specialTrackKey: string
  ): ILegacyTrack | undefined => {
    const specialTrack = specialTracksRules[specialTrackKey];
    if (isInCampaign && specialTracksCampaignValues && specialTrack.shared) {
      return specialTracksCampaignValues[specialTrackKey];
    } else if (
      (!isInCampaign || !specialTrack.shared) &&
      specialTracksCharacterValues
    ) {
      return specialTracksCharacterValues[specialTrackKey];
    }
    return undefined;
  };

  const updateCharacter = useUpdateCharacterMutation(characterId ?? "");
  const updateCampaign = useUpdateCampaignMutation(campaignId ?? "");

  const getUpdatedSpecialTracks = (
    currentValues: Record<string, ILegacyTrack> | undefined,
    specialTrackKey: string,
    patch: Partial<ILegacyTrack>
  ) => ({
    ...(currentValues ?? {}),
    [specialTrackKey]: {
      value: 0,
      isLegacy: false,
      spentExperience: {},
      ...(currentValues?.[specialTrackKey] ?? {}),
      ...patch,
    },
  });

  const updateSpecialTrackValue = (
    specialTrackKey: string,
    newValue: number
  ) => {
    const specialTrack = specialTracksRules[specialTrackKey];

    if (specialTrack.shared && isInCampaign) {
      return updateCampaign.mutateAsync({
        specialTracksJson: getUpdatedSpecialTracks(
          specialTracksCampaignValues,
          specialTrackKey,
          { value: newValue }
        ),
      });
    } else {
      return updateCharacter.mutateAsync({
        specialTracksJson: getUpdatedSpecialTracks(
          specialTracksCharacterValues,
          specialTrackKey,
          { value: newValue }
        ),
      });
    }
  };

  const updateSpecialTrackExperienceChecked = (
    specialTrackKey: string,
    index: number,
    checked: boolean
  ) => {
    const specialTrack = specialTracksRules[specialTrackKey];

    if (specialTrack.shared && isInCampaign) {
      return updateCampaign.mutateAsync({
        specialTracksJson: getUpdatedSpecialTracks(
          specialTracksCampaignValues,
          specialTrackKey,
          {
            spentExperience: {
              ...(specialTracksCampaignValues?.[specialTrackKey]
                ?.spentExperience ?? {}),
              [index]: checked,
            },
          }
        ),
      });
    } else {
      return updateCharacter.mutateAsync({
        specialTracksJson: getUpdatedSpecialTracks(
          specialTracksCharacterValues,
          specialTrackKey,
          {
            spentExperience: {
              ...(specialTracksCharacterValues?.[specialTrackKey]
                ?.spentExperience ?? {}),
              [index]: checked,
            },
          }
        ),
      });
    }
  };

  const updateSpecialTrackIsLegacy = (
    specialTrackKey: string,
    checked: boolean
  ) => {
    const specialTrack = specialTracksRules[specialTrackKey];

    const newTrack: ILegacyTrack = {
      value: 0,
      isLegacy: checked,
      spentExperience: {},
    };

    if (specialTrack.shared && isInCampaign) {
      return updateCampaign.mutateAsync({
        specialTracksJson: {
          ...(specialTracksCampaignValues ?? {}),
          [specialTrackKey]: newTrack,
        },
      });
    } else {
      return updateCharacter.mutateAsync({
        specialTracksJson: {
          ...(specialTracksCharacterValues ?? {}),
          [specialTrackKey]: newTrack,
        },
      });
    }
  };

  const isIronsworn = useGameSystem().gameSystem === GAME_SYSTEMS.IRONSWORN;

  if (isIronsworn) {
    return (
      <>
        <SectionHeading label={"Experience"} />
        <Box px={2}>
          <ExperienceTrack />
        </Box>
        <SectionHeading label={"Legacy Tracks"} />
        <Stack spacing={2} px={2}>
          {Object.keys(specialTracksRules).map((specialTrackKey) => (
            <ProgressTrack
              label={specialTracksRules[specialTrackKey].label}
              key={specialTrackKey}
              value={getSpecialTrackValue(specialTrackKey)?.value ?? 0}
              max={40}
              onValueChange={(value) =>
                updateSpecialTrackValue(specialTrackKey, value)
              }
            />
          ))}
        </Stack>
      </>
    );
  }
  return (
    <>
      <SectionHeading label={"Legacy Tracks"} />
      <Stack spacing={2} px={2} sx={{ overflowX: "auto" }}>
        {Object.keys(specialTracksRules).map((specialTrackKey) => {
          const specialTrackValue = getSpecialTrackValue(specialTrackKey);
          return (
            <LegacyTrack
              key={specialTrackKey}
              label={specialTracksRules[specialTrackKey].label}
              value={specialTrackValue?.value ?? 0}
              checkedExperience={specialTrackValue?.spentExperience ?? {}}
              onValueChange={(value) =>
                updateSpecialTrackValue(specialTrackKey, value)
              }
              onExperienceChecked={(index, checked) =>
                updateSpecialTrackExperienceChecked(
                  specialTrackKey,
                  index,
                  checked
                )
              }
              isLegacy={specialTrackValue?.isLegacy ?? false}
              onIsLegacyChecked={(checked) =>
                updateSpecialTrackIsLegacy(specialTrackKey, checked)
              }
            />
          );
        })}
      </Stack>
    </>
  );
}
