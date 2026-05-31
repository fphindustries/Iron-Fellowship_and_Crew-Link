import { Datasworn } from "@datasworn/core";
import { Box, Chip, Stack, TextField, Typography } from "@mui/material";
import { StatComponent } from "components/features/characters/StatComponent";
import { useStore } from "stores/store";
import { MoveAssetControl } from "./MoveAssetControl";
import { useEffect, useState } from "react";
import { useUpdateCharacterMutation } from "hooks/queries/useCharactersQuery";
import { StatRoll } from "types/DieRolls.type";

export interface MoveRollersProps {
  move: Datasworn.Move;
  onRollComplete?: (roll: StatRoll) => void;
  initialPlayerContext?: string;
  playerContext?: string;
  onPlayerContextChange?: (value: string) => void;
}

export function MoveRollers(props: MoveRollersProps) {
  const {
    move,
    onRollComplete,
    initialPlayerContext = "",
    playerContext: controlledPlayerContext,
    onPlayerContextChange,
  } = props;

  const statRules = useStore((store) => store.rules.stats);
  const conditionMeterRules = useStore((store) => store.rules.conditionMeters);

  const isInCampaign = useStore(
    (store) => !!store.characters.currentCharacter.currentCharacter?.campaignId
  );
  const characterStats = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.stats
  );
  const characterConditionMeters = useStore(
    (store) =>
      store.characters.currentCharacter.currentCharacter?.conditionMeters
  );
  const campaignConditionMeters = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.conditionMeters
  );

  const hasCharacter = useStore(
    (store) => !!store.characters.currentCharacter.currentCharacter
  );
  const adds = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.adds ?? 0
  );
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const updateAdds = useUpdateCharacterMutation(characterId ?? "");

  const activeSessionId = useStore(
    (store) => store.sessionLog.activeSessionId
  );
  const isSessionActive = !!activeSessionId;

  const [internalPlayerContext, setInternalPlayerContext] =
    useState(initialPlayerContext);
  const playerContext = controlledPlayerContext ?? internalPlayerContext;
  const setPlayerContext = onPlayerContextChange ?? setInternalPlayerContext;

  useEffect(() => {
    if (controlledPlayerContext === undefined) {
      setInternalPlayerContext(initialPlayerContext);
    }
  }, [controlledPlayerContext, initialPlayerContext]);

  const getConditionMeterValue = (conditionMeterKey: string): number => {
    const conditionMeter = conditionMeterRules[conditionMeterKey];

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

  if (move.roll_type === "action_roll") {
    const stats: Record<string, boolean> = {};
    const conditionMeters: Record<string, boolean> = {};
    const assetControls: Record<string, boolean> = {};

    move.trigger.conditions.forEach((trigger) => {
      trigger.roll_options.forEach((option) => {
        if (option.using === "stat") {
          stats[option.stat] = true;
        } else if (option.using === "condition_meter") {
          conditionMeters[option.condition_meter] = true;
        } else if (option.using === "asset_control") {
          assetControls[option.control] = true;
        }
      });
    });
    const rollDisabled = isSessionActive && !playerContext.trim();

    return (
      <Box mt={0.5}>
        {isSessionActive && (
          <Box mb={1}>
            <Typography variant="caption" color="textSecondary" display="block" mb={0.5}>
              What are you doing?
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="Describe your action..."
              value={playerContext}
              onChange={(e) => setPlayerContext(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </Box>
        )}
        <Box display={"flex"} flexWrap={"wrap"} gap={0.5}>
          {Object.keys(statRules)
            .filter((stat) => stats[stat])
            .map((stat) =>
              characterStats ? (
                <StatComponent
                  key={stat}
                  label={statRules[stat].label}
                  value={characterStats[stat]}
                  moveInfo={{
                    name: move.name,
                    id: move._id,
                  }}
                  disableRoll={rollDisabled}
                  playerContext={playerContext}
                  onRollComplete={(roll) => { setPlayerContext(""); onRollComplete?.(roll); }}
                />
              ) : (
                <Chip
                  key={stat}
                  label={stat}
                  sx={{ textTransform: "capitalize" }}
                />
              )
            )}
          {Object.keys(conditionMeterRules)
            .filter((cm) => conditionMeters[cm])
            .map((conditionMeterKey) =>
              characterConditionMeters ? (
                <StatComponent
                  key={conditionMeterKey}
                  label={conditionMeterRules[conditionMeterKey].label}
                  value={getConditionMeterValue(conditionMeterKey)}
                  moveInfo={{
                    name: move.name,
                    id: move._id,
                  }}
                  disableRoll={rollDisabled}
                  playerContext={playerContext}
                  onRollComplete={(roll) => { setPlayerContext(""); onRollComplete?.(roll); }}
                />
              ) : (
                <Chip
                  key={conditionMeterKey}
                  label={conditionMeterRules[conditionMeterKey].label}
                  sx={{ textTransform: "capitalize" }}
                />
              )
            )}
          {Object.keys(assetControls).map((assetControl) => (
            <MoveAssetControl
              key={assetControl}
              control={assetControl}
              move={move}
            />
          ))}

          {hasCharacter && (
            <StatComponent
              label={"Adds"}
              updateTrack={(newValue) => updateAdds.mutateAsync({ adds: newValue })}
              value={adds}
            />
          )}
        </Box>
      </Box>
    );
  } else if (move.roll_type === "progress_roll") {
    const trackCategory = move.tracks.category;
    return <Chip label={trackCategory} sx={{ textTransform: "capitalize" }} />;
  } else if (move.roll_type === "special_track") {
    const specialTracks: string[] = [];
    move.trigger.conditions.forEach((condition) => {
      condition.roll_options.forEach((option) =>
        specialTracks.push(option.using)
      );
    });

    return (
      <Stack spacing={0.5} direction={"row"} flexWrap={"wrap"}>
        {specialTracks.map((specialTrack) => (
          <Chip
            key={specialTrack}
            label={specialTrack}
            sx={{ textTransform: "capitalize" }}
          />
        ))}
      </Stack>
    );
  }

  return <></>;
}
