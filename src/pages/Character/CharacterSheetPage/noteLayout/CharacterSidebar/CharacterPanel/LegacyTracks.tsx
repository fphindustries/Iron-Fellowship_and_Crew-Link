import { Box, Typography } from "@mui/material";
import { LegacyTrack } from "./LegacyTrack";
import { useStore } from "stores/store";
import { LegacyTrack as ILegacyTrack } from "types/LegacyTrack.type";
import { useUpdateCharacterMutation } from "hooks/queries/useCharactersQuery";
import { useUpdateCampaignMutation } from "hooks/queries/useCampaignsQuery";

export function LegacyTracks() {
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

  return (
    <Box mt={2}>
      <Typography
        fontFamily={(theme) => theme.fontFamilyTitle}
        variant={"h6"}
        color={"text.secondary"}
      >
        Legacy Tracks
      </Typography>
      <Box display={"flex"} flexDirection={"column"} gap={1}>
        {Object.keys(specialTracksRules).map((specialTrackKey) => (
          <LegacyTrack
            key={specialTrackKey}
            rule={specialTracksRules[specialTrackKey]}
            value={getSpecialTrackValue(specialTrackKey)}
            toggleIsLegacy={(isLegacy) =>
              updateSpecialTrackIsLegacy(specialTrackKey, isLegacy)
            }
            onValueChange={(value) =>
              updateSpecialTrackValue(specialTrackKey, value)
            }
          />
        ))}
      </Box>
    </Box>
  );
}
