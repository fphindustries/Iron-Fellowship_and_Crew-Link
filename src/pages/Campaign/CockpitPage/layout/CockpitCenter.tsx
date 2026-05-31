import { Box, Chip, Stack, Typography } from "@mui/material";
import { useStore } from "stores/store";
import { CurrentScenePanel } from "../scene/CurrentScenePanel";
import { CockpitComposer } from "./CockpitComposer";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { useActiveCombatQuery } from "hooks/queries/useCombatQuery";

export function CockpitCenter() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const npcCount = useStore(
    (store) => Object.keys(store.aiGuide.state?.npcIntents ?? {}).length
  );
  const activeJourneyCount = useStore(
    (store) =>
      Object.keys(
        store.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active]?.[
          TrackTypes.Journey
        ] ?? {}
      ).length
  );
  const { data: activeCombat } = useActiveCombatQuery({
    campaignId: campaignId ?? undefined,
  });
  const contextLabel = activeCombat
    ? "Combat"
    : activeJourneyCount > 0
    ? "Expedition"
    : npcCount > 0
    ? "Social"
    : "Scene";

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">
            Current context
          </Typography>
          <Chip
            label={contextLabel}
            size="small"
            color={
              contextLabel === "Combat"
                ? "error"
                : contextLabel === "Expedition"
                ? "primary"
                : contextLabel === "Social"
                ? "secondary"
                : "default"
            }
            variant="outlined"
          />
          {activeCombat?.dataJson?.position && (
            <Chip
              label={
                activeCombat.dataJson.position === "in_control"
                  ? "In control"
                  : "In a bad spot"
              }
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
      </Box>

      <Box flex={1} overflow="auto">
        <CurrentScenePanel />
      </Box>

      <CockpitComposer />
    </Box>
  );
}
