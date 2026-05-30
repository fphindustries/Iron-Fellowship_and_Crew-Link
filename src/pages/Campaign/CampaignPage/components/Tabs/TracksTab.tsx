import { Container, Grid, Stack } from "@mui/material";
import { SectionHeading } from "components/shared/SectionHeading";
import { Track } from "components/features/Track";
import {
  TrackStatus,
  TrackTypes,
  ProgressTrack as ProgressTrackDocument,
} from "types/Track.type";
import {
  ProgressTrack,
  ProgressTrackList,
} from "components/features/ProgressTrack";
import { useStore } from "stores/store";
import { ClockSection } from "components/features/charactersAndCampaigns/Clocks/ClockSection";
import { useGameSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { ignoreApiError } from "config/api.config";
import { useUpdateCampaignMutation } from "hooks/queries/useCampaignsQuery";
import { useUpdateCharacterTrackMutation } from "hooks/queries/useCharactersQuery";

export function TracksTab() {
  const isStarforged = useGameSystem().gameSystem === GAME_SYSTEMS.STARFORGED;

  const conditionMeterRules = useStore((store) => store.rules.conditionMeters);
  const conditionMeterValues = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.conditionMeters
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const updateCampaign = useUpdateCampaignMutation(campaignId ?? "");

  const characterTracks = useStore(
    (store) => store.campaigns.currentCampaign.characters.characterTracks
  );
  const characters = useStore(
    (store) => store.campaigns.currentCampaign.characters.characterMap
  );

  return (
    <Stack spacing={2} sx={{ pb: 2 }}>
      <SectionHeading label={"Shared Condition Meters"} />
      <Container maxWidth={false}>
        <Grid container spacing={2}>
          {Object.keys(conditionMeterRules)
            .filter((cm) => conditionMeterRules[cm].shared)
            .map((cm) => (
              <Grid key={cm} item xs={12} sm={6} lg={4}>
                <Track
                  min={conditionMeterRules[cm].min}
                  max={conditionMeterRules[cm].max}
                  value={
                    conditionMeterValues?.[cm] ?? conditionMeterRules[cm].value
                  }
                  label={conditionMeterRules[cm].label}
                  onChange={(newValue) =>
                    updateCampaign
                      .mutateAsync({
                        conditionMetersJson: {
                          ...(conditionMeterValues ?? {}),
                          [cm]: newValue,
                        },
                      })
                      .catch(ignoreApiError)
                  }
                />
              </Grid>
            ))}
        </Grid>
      </Container>

      <div>
        <ProgressTrackList
          trackType={TrackTypes.Fray}
          typeLabel={"Shared Combat Track"}
          isCampaign
        />
        <ProgressTrackList
          trackType={TrackTypes.Vow}
          typeLabel={"Shared Vow"}
          isCampaign
        />
        <ProgressTrackList
          trackType={TrackTypes.Journey}
          typeLabel={isStarforged ? "Shared Expedition" : "Shared Journey"}
          isCampaign
        />
        {isStarforged && (
          <ProgressTrackList
            trackType={TrackTypes.SceneChallenge}
            typeLabel={"Shared Scene Challenge"}
            isCampaign
          />
        )}
        {Object.keys(characterTracks).map((characterId) => (
          <div key={characterId}>
            {characters[characterId] &&
              Object.keys(characterTracks[characterId]?.[TrackTypes.Vow] ?? {})
                .length > 0 && (
                <>
                  <SectionHeading
                    label={characters[characterId].name + "'s Vows"}
                  />
                  <Stack mt={2} spacing={4} mb={4} px={{ xs: 2, sm: 3 }}>
                    {Object.keys(
                      characterTracks[characterId]?.[TrackTypes.Vow] ?? {}
                    ).map((trackId) => (
                      <CharacterProgressTrack
                        key={trackId}
                        characterId={characterId}
                        trackId={trackId}
                        track={
                          characterTracks[characterId][TrackTypes.Vow][trackId]
                        }
                      />
                    ))}
                  </Stack>
                </>
              )}
          </div>
        ))}
      </div>
      <ClockSection />
    </Stack>
  );
}

function CharacterProgressTrack(props: {
  characterId: string;
  trackId: string;
  track: ProgressTrackDocument;
}) {
  const { characterId, trackId, track } = props;
  const updateCharacterTrack = useUpdateCharacterTrackMutation(characterId);

  return (
    <ProgressTrack
      status={track.status}
      trackType={TrackTypes.Vow}
      label={track.label}
      description={track.description}
      difficulty={track.difficulty}
      value={track.value}
      max={40}
      onValueChange={(value) =>
        updateCharacterTrack
          .mutateAsync({ trackId, dataJson: { ...track, value } })
          .catch(ignoreApiError)
      }
      onComplete={() =>
        updateCharacterTrack
          .mutateAsync({
            trackId,
            dataJson: { ...track, status: TrackStatus.Completed },
          })
          .catch(ignoreApiError)
      }
    />
  );
}
