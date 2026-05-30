import { Box, Drawer, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useStore } from "stores/store";
import { MoveRollers } from "components/features/charactersAndCampaigns/LinkedDialog/LinkedDialogContent/MoveDialogContent/MoveRollers";
import { MarkdownRenderer } from "components/shared/MarkdownRenderer";
import { ProgressTrack } from "components/features/ProgressTrack";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { EntityRef } from "./CockpitContext";
import { KnowledgeBadge } from "./KnowledgeBadge";
import { useUpdateCampaignTrackMutation } from "hooks/queries/useCampaignsQuery";
import { ignoreApiError } from "config/api.config";

interface EntityDrawerProps {
  entity: EntityRef | null;
  onClose: () => void;
}

export function EntityDrawer({ entity, onClose }: EntityDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={Boolean(entity)}
      onClose={onClose}
      PaperProps={{ sx: { width: 400, maxWidth: "100vw", display: "flex", flexDirection: "column" } }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1.5,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        <Typography variant="h6" sx={{ flex: 1, fontSize: "1rem" }}>
          {entity?.type === "npc" && entity.name}
          {entity?.type === "move" && "Move"}
          {entity?.type === "vow" && entity.label}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {entity?.type === "npc" && <NPCDetail name={entity.name} />}
        {entity?.type === "move" && <MoveDetail moveId={entity.moveId} />}
        {entity?.type === "vow" && <VowDetail trackId={entity.trackId} />}
      </Box>
    </Drawer>
  );
}

function NPCDetail({ name }: { name: string }) {
  const npcIntent = useStore((store) => store.aiGuide.state?.npcIntents[name]);
  const npcEntry = useStore((store) => {
    const npcMap = store.worlds.currentWorld.currentWorldNPCs.npcMap;
    return Object.values(npcMap).find((n) => n.name === name) ?? null;
  });

  const knowledge =
    !npcIntent?.firstImpressionRevealed
      ? "hidden"
      : (npcIntent?.hiddenAspects?.length ?? 0) > 0
      ? "suspected"
      : "known";

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="h6">{name}</Typography>
        {npcIntent && <KnowledgeBadge knowledge={knowledge} />}
      </Box>

      {npcEntry?.gmProperties && (
        <>
          {npcEntry.gmProperties.goal && (
            <Field label="Goal" value={npcEntry.gmProperties.goal} />
          )}
          {npcEntry.gmProperties.role && (
            <Field label="Role" value={npcEntry.gmProperties.role} />
          )}
          {npcEntry.gmProperties.disposition && (
            <Field label="Disposition" value={npcEntry.gmProperties.disposition} />
          )}
        </>
      )}

      {npcIntent && (
        <>
          {npcIntent.firstImpressionRevealed && npcIntent.currentIntent && (
            <Field label="Current Intent" value={npcIntent.currentIntent} />
          )}
          {npcIntent.hiddenAspects.length > 0 && npcIntent.firstImpressionRevealed && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                Hidden Aspects
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                {npcIntent.hiddenAspects.map((aspect, i) => (
                  <Typography key={i} component="li" variant="body2" color="text.secondary">
                    {aspect}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

function MoveDetail({ moveId }: { moveId: string }) {
  const move = useStore((store) => store.rules.moveMaps.moveMap[moveId]);

  if (!move) {
    return (
      <Typography variant="body2" color="text.secondary">
        Move not found.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" mb={1.5}>
        {move.name}
      </Typography>
      <MoveRollers move={move} />
      <Box mt={1.5}>
        <MarkdownRenderer markdown={move.text} />
      </Box>
    </Box>
  );
}

function VowDetail({ trackId }: { trackId: string }) {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const track = useStore(
    (store) =>
      store.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active]?.[
        TrackTypes.Vow
      ]?.[trackId] ?? null
  );
  const updateTrack = useUpdateCampaignTrackMutation(campaignId);

  if (!track) {
    return (
      <Typography variant="body2" color="text.secondary">
        Track not found.
      </Typography>
    );
  }

  return (
    <Box>
      {track.description && (
        <Typography variant="body2" color="text.secondary" mb={2} sx={{ fontStyle: "italic" }}>
          {track.description}
        </Typography>
      )}
      <ProgressTrack
        trackType={TrackTypes.Vow}
        status={track.status}
        label={track.label}
        difficulty={track.difficulty}
        value={track.value}
        max={40}
        onValueChange={(value) =>
          updateTrack
            .mutateAsync({ trackId, dataJson: { ...track, value } })
            .catch(ignoreApiError)
        }
        onComplete={() =>
          updateTrack
            .mutateAsync({
              trackId,
              dataJson: { ...track, status: TrackStatus.Completed },
            })
            .catch(ignoreApiError)
        }
      />
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
