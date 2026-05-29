import { Box, Divider, IconButton, Popover, Tooltip, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useStore } from "stores/store";
import { ProgressTrack } from "components/features/ProgressTrack";
import { ClockCircle } from "components/features/charactersAndCampaigns/Clocks/ClockCircle";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { TensionClock } from "types/AIGuideState.type";
import { useState } from "react";
import { useCockpit } from "../shared/CockpitContext";
import { KnowledgeBadge } from "../shared/KnowledgeBadge";

export function CockpitRightRail() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const trackMap = useStore(
    (store) => store.campaigns.currentCampaign.tracks.trackMap
  );
  const updateTrack = useStore(
    (store) => store.campaigns.currentCampaign.tracks.updateTrack
  );
  const tensionClocks = useStore(
    (store) => store.aiGuide.state?.tensionClocks ?? []
  );
  const saveGuideState = useStore((store) => store.aiGuide.saveGuideState);
  const guideState = useStore((store) => store.aiGuide.state);

  const activeVows = Object.entries(
    trackMap[TrackStatus.Active]?.[TrackTypes.Vow] ?? {}
  );
  const activeJourneys = Object.entries(
    trackMap[TrackStatus.Active]?.[TrackTypes.Journey] ?? {}
  );
  const activeClocks = Object.entries(
    trackMap[TrackStatus.Active]?.[TrackTypes.Clock] ?? {}
  );

  const { openEntity } = useCockpit();

  const handleAdvanceTensionClock = async (clock: TensionClock) => {
    if (!campaignId || !guideState) return;
    const newFilled = Math.min(clock.segments, clock.filled + 1);
    await saveGuideState(campaignId, {
      ...guideState,
      tensionClocks: guideState.tensionClocks.map((c) =>
        c.id === clock.id ? { ...c, filled: newFilled } : c
      ),
    });
  };

  const hasContent =
    activeVows.length > 0 ||
    activeJourneys.length > 0 ||
    activeClocks.length > 0 ||
    tensionClocks.length > 0;

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "auto",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ px: 0.5 }}>
        Trackers &amp; Vows
      </Typography>

      {!hasContent && (
        <Typography variant="body2" color="text.disabled" sx={{ px: 0.5 }}>
          No active tracks yet.
        </Typography>
      )}

      {activeVows.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mb={0.5}
            sx={{ px: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            Vows
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            {activeVows.map(([trackId, track]) => (
              <Box key={trackId} sx={{ position: "relative" }}>
                <ProgressTrack
                  trackType={TrackTypes.Vow}
                  status={track.status}
                  label={track.label}
                  difficulty={track.difficulty}
                  value={track.value}
                  max={40}
                  hideRollButton
                  onValueChange={(value) => updateTrack(trackId, { value })}
                  onComplete={() =>
                    updateTrack(trackId, { status: TrackStatus.Completed })
                  }
                />
                <Tooltip title="View details">
                  <IconButton
                    size="small"
                    onClick={() => openEntity({ type: "vow", trackId, label: track.label })}
                    sx={{ position: "absolute", top: 2, right: 0 }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {activeJourneys.length > 0 && (
        <>
          {activeVows.length > 0 && <Divider />}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
              sx={{ px: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Journeys
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              {activeJourneys.map(([trackId, track]) => (
                <ProgressTrack
                  key={trackId}
                  trackType={TrackTypes.Journey}
                  status={track.status}
                  label={track.label}
                  difficulty={track.difficulty}
                  value={track.value}
                  max={40}
                  hideRollButton
                  onValueChange={(value) => updateTrack(trackId, { value })}
                  onComplete={() =>
                    updateTrack(trackId, { status: TrackStatus.Completed })
                  }
                />
              ))}
            </Box>
          </Box>
        </>
      )}

      {activeClocks.length > 0 && (
        <>
          {(activeVows.length > 0 || activeJourneys.length > 0) && <Divider />}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
              sx={{ px: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Clocks
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1.5} sx={{ px: 0.5 }}>
              {activeClocks.map(([trackId, clock]) => (
                <Box key={trackId} display="flex" flexDirection="column" alignItems="center" gap={0.5} sx={{ width: 72 }}>
                  <ClockCircle
                    segments={clock.segments ?? 4}
                    value={clock.value}
                    size="small"
                    onClick={() => updateTrack(trackId, { value: Math.min(clock.segments ?? 4, clock.value + 1) })}
                  />
                  <Typography variant="caption" textAlign="center" sx={{ lineHeight: 1.2, wordBreak: "break-word" }}>
                    {clock.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}

      {tensionClocks.length > 0 && (
        <>
          {(activeVows.length > 0 || activeJourneys.length > 0 || activeClocks.length > 0) && <Divider />}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
              sx={{ px: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Tension Clocks
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1.5} sx={{ px: 0.5 }}>
              {tensionClocks.map((clock) => (
                <TensionClockRow
                  key={clock.id}
                  clock={clock}
                  onAdvance={() => handleAdvanceTensionClock(clock)}
                />
              ))}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

interface TensionClockRowProps {
  clock: TensionClock;
  onAdvance: () => void;
}

function TensionClockRow({ clock, onAdvance }: TensionClockRowProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={0.5} sx={{ width: 72 }}>
      <ClockCircle
        segments={clock.segments}
        value={clock.filled}
        size="small"
        onClick={(e?: React.MouseEvent<HTMLElement>) => {
          if (e) setAnchorEl(e.currentTarget);
          else onAdvance();
        }}
      />
      <Box display="flex" flexDirection="column" alignItems="center" gap={0.25}>
        <Typography
          variant="caption"
          textAlign="center"
          color="warning.main"
          sx={{ lineHeight: 1.2, wordBreak: "break-word" }}
        >
          {clock.label}
        </Typography>
        {clock.hiddenFromPlayers && (
          <KnowledgeBadge knowledge="hidden" />
        )}
      </Box>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Box sx={{ p: 1.5, maxWidth: 220 }}>
          <Typography variant="body2" fontWeight={600} mb={0.5}>
            {clock.label}
          </Typography>
          {clock.consequence && (
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              {clock.consequence}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="primary"
            sx={{ cursor: "pointer" }}
            onClick={() => { onAdvance(); setAnchorEl(null); }}
          >
            Advance clock →
          </Typography>
        </Box>
      </Popover>
    </Box>
  );
}
