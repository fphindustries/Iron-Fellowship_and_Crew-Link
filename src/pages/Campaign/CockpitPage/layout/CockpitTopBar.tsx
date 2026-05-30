import { Box, Button, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { useStore } from "stores/store";
import { LocationOn, Shield, TrackChanges } from "@mui/icons-material";
import { TrackStatus, TrackTypes } from "types/Track.type";

interface CockpitTopBarProps {
  onOpenGuide: () => void;
  onOpenHistory: () => void;
}

export function CockpitTopBar({ onOpenGuide, onOpenHistory }: CockpitTopBarProps) {
  const scene = useStore((store) => store.aiGuide.state?.currentScene);
  const campaignName = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.name
  );

  const activeVowMap = useStore(
    (store) =>
      store.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active]?.[
        TrackTypes.Vow
      ] ?? {}
  );
  const topVow = Object.values(activeVowMap)[0];

  const tensionClocks = useStore(
    (store) => store.aiGuide.state?.tensionClocks ?? []
  );
  const activeClock = tensionClocks.find(
    (c) => !c.hiddenFromPlayers && c.filled < c.segments
  );

  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
        minHeight: 48,
      }}
    >
      <Typography variant="subtitle2" fontWeight="bold" noWrap>
        {campaignName}
      </Typography>

      {scene?.title && (
        <>
          <Typography variant="body2" color="text.secondary">
            /
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <LocationOn sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" noWrap>
              {scene.title}
            </Typography>
          </Stack>
        </>
      )}

      <Box flex={1} />

      <Button size="small" variant="outlined" color="inherit" onClick={onOpenHistory} sx={{ opacity: 0.7 }}>
        History
      </Button>
      <Button size="small" variant="outlined" color="inherit" onClick={onOpenGuide} sx={{ opacity: 0.85 }}>
        Ask Guide
      </Button>

      {topVow && (
        <Tooltip title={`Active vow: ${topVow.label}`}>
          <Chip
            icon={<TrackChanges sx={{ fontSize: 14 }} />}
            label={topVow.label}
            size="small"
            variant="outlined"
            sx={{ maxWidth: 200 }}
          />
        </Tooltip>
      )}

      {activeClock && (
        <Tooltip title={activeClock.consequence || activeClock.label}>
          <Chip
            icon={<Shield sx={{ fontSize: 14 }} />}
            label={`${activeClock.label} ${activeClock.filled}/${activeClock.segments}`}
            size="small"
            color="warning"
            variant="outlined"
          />
        </Tooltip>
      )}
    </Box>
  );
}
