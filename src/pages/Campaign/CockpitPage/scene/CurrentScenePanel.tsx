import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { useMemo, useState } from "react";
import { useStore } from "stores/store";
import { MarkdownRenderer } from "components/shared/MarkdownRenderer/MarkdownRenderer";
import {
  SceneEvent,
  useDeleteSceneEventMutation,
  useSceneEventsQuery,
} from "hooks/queries/useSceneEventsQuery";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { PortraitAvatar } from "components/features/characters/PortraitAvatar/PortraitAvatar";
import { CharacterDocument } from "types/Character.type";

type TimelineEntry =
  | {
      id: string;
      kind: "setup";
      title: string;
      body: string;
    }
  | {
      id: string;
      kind: "event";
      title: string;
      actor: string;
      actorCharacter?: Pick<
        CharacterDocument,
        "uid" | "name" | "profileImage"
      > & { id: string };
      body: string;
      intent?: string;
      outcome?: string;
      createdAt?: string;
      sessionId?: string | null;
    };

export function CurrentScenePanel() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const activeSessionId = useStore((store) => store.sessionLog.activeSessionId);
  const scene = useStore((store) => store.aiGuide.state?.currentScene);
  const launchSetup = useStore((store) => store.aiGuide.state?.launchSetup);
  const isLoading = useStore((store) => store.aiGuide.isLoading);
  const characterMap = useStore(
    (store) => store.campaigns.currentCampaign.characters.characterMap
  );
  const activeVowMap = useStore(
    (store) =>
      store.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active]?.[
        TrackTypes.Vow
      ] ?? {}
  );
  const updateScene = useStore((store) => store.aiGuide.updateScene);
  const { data: sceneEvents } = useSceneEventsQuery(
    campaignId,
    activeSessionId ?? undefined,
    Boolean(activeSessionId)
  );
  const deleteSceneEvent = useDeleteSceneEventMutation(campaignId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TimelineEntry | undefined>();

  const entries = useMemo<TimelineEntry[]>(() => {
    const setupEntries: TimelineEntry[] = [];
    if (launchSetup?.incitingIncident) {
      setupEntries.push({
        id: "setup-inciting-incident",
        kind: "setup",
        title: "Inciting Incident",
        body: launchSetup.incitingIncident,
      });
    }
    if (launchSetup?.openingScene) {
      setupEntries.push({
        id: "setup-opening-scene",
        kind: "setup",
        title: "Opening Scene",
        body: launchSetup.openingScene,
      });
    }
    const startingVow = launchSetup?.vowTrackId
      ? activeVowMap[launchSetup.vowTrackId]
      : undefined;
    if (startingVow) {
      setupEntries.push({
        id: "setup-starting-vow",
        kind: "setup",
        title: "Starting Vow",
        body: `${startingVow.label}\n\nRank: ${startingVow.difficulty}`,
      });
    }
    if (launchSetup?.swearMoveResult) {
      setupEntries.push({
        id: "setup-swear-result",
        kind: "setup",
        title: "Swear an Iron Vow Result",
        body: formatSwearMoveResult(launchSetup.swearMoveResult),
      });
    }
    if (launchSetup?.nextStepPrompt) {
      setupEntries.push({
        id: "setup-next-step",
        kind: "setup",
        title: "Quest Direction",
        body: launchSetup.nextStepPrompt,
      });
    }
    if (launchSetup?.swearMoveObstacle?.text) {
      setupEntries.push({
        id: "setup-starting-obstacle",
        kind: "setup",
        title: "Starting Obstacle",
        body: launchSetup.swearMoveObstacle.text,
      });
    }
    if (setupEntries.length === 0 && scene?.description) {
      setupEntries.push({
        id: "setup-scene-context",
        kind: "setup",
        title: "Scene Context",
        body: scene.description,
      });
    }

    const eventEntries = (sceneEvents ?? []).map((event) =>
      sceneEventToTimelineEntry(event, characterMap)
    );

    return [...setupEntries, ...eventEntries];
  }, [activeVowMap, characterMap, launchSetup, scene?.description, sceneEvents]);

  const handleSaveTitle = async () => {
    if (!campaignId || !titleDraft.trim()) return;
    await updateScene(campaignId, { title: titleDraft.trim() });
    setEditingTitle(false);
    setTitleDraft("");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteTarget.kind !== "event") return;
    await deleteSceneEvent.mutateAsync({
      eventId: deleteTarget.id,
      sessionId: deleteTarget.sessionId ?? activeSessionId,
    });
    setDeleteTarget(undefined);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="rectangular" height={80} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
      {editingTitle ? (
        <Stack direction="row" gap={1} alignItems="center">
          <TextField
            size="small"
            autoFocus
            fullWidth
            value={titleDraft}
            placeholder="Scene title..."
            onChange={(event) => setTitleDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSaveTitle();
              if (event.key === "Escape") setEditingTitle(false);
            }}
          />
          <Button size="small" onClick={handleSaveTitle}>
            Save
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={() => setEditingTitle(false)}
          >
            Cancel
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" alignItems="center" gap={0.5}>
          <Typography variant="h6" fontWeight="bold" flex={1}>
            {scene?.title || "Current Scene"}
          </Typography>
          <Button
            size="small"
            color="inherit"
            startIcon={<EditIcon sx={{ fontSize: 14 }} />}
            sx={{ opacity: 0.6, minWidth: "auto", px: 0.5 }}
            onClick={() => {
              setTitleDraft(scene?.title ?? "");
              setEditingTitle(true);
            }}
          >
            Edit
          </Button>
        </Stack>
      )}

      {scene?.unresolvedQuestions && scene.unresolvedQuestions.length > 0 && (
        <Box>
          <Typography
            variant="overline"
            color="text.secondary"
            display="block"
            gutterBottom
          >
            Open Questions
          </Typography>
          {scene.unresolvedQuestions.map((question, index) => (
            <Typography key={index} variant="body2" color="text.secondary">
              - {question}
            </Typography>
          ))}
        </Box>
      )}

      <Stack gap={1.25}>
        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No scene events yet.
          </Typography>
        ) : (
          entries.map((entry, index) => (
            <TimelineCard
              key={entry.id}
              entry={entry}
              index={index}
              onDelete={
                entry.kind === "event" ? () => setDeleteTarget(entry) : undefined
              }
            />
          ))
        )}
      </Stack>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Activity?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete "{deleteTarget?.title}" from the cockpit timeline? This cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteTarget(undefined)}
            disabled={deleteSceneEvent.isPending}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={deleteSceneEvent.isPending}
          >
            {deleteSceneEvent.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function TimelineCard({
  entry,
  index,
  onDelete,
}: {
  entry: TimelineEntry;
  index: number;
  onDelete?: () => void;
}) {
  return (
    <Box
      sx={{
        borderLeft: 2,
        borderColor: entry.kind === "setup" ? "primary.main" : "warning.main",
        pl: 1.25,
        py: 0.5,
      }}
    >
      <Stack direction="row" alignItems="flex-start" gap={0.75}>
        {entry.kind === "event" && entry.actorCharacter && (
          <PortraitAvatar
            uid={entry.actorCharacter.uid}
            characterId={entry.actorCharacter.id}
            name={entry.actorCharacter.name}
            portraitSettings={entry.actorCharacter.profileImage ?? undefined}
            size="small"
            colorful
            rounded
          />
        )}
        <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" flex={1}>
          <Chip label={index + 1} size="small" variant="outlined" sx={{ height: 20 }} />
          <Typography variant="subtitle2">{entry.title}</Typography>
          {entry.kind === "event" && (
            <>
              <Typography variant="caption" color="text.secondary">
                by {entry.actor}
              </Typography>
              {entry.outcome && (
                <Chip label={entry.outcome} size="small" variant="outlined" />
              )}
            </>
          )}
        </Stack>
        {onDelete && (
          <Tooltip title="Delete activity">
            <IconButton
              size="small"
              onClick={onDelete}
              sx={{ p: 0.25, opacity: 0.65, flexShrink: 0 }}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {entry.kind === "event" && entry.intent && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {entry.intent}
        </Typography>
      )}

      {entry.body && (
        <Box sx={{ mt: 0.5 }}>
          <MarkdownRenderer markdown={entry.body} typographyVariant="body2" />
        </Box>
      )}
    </Box>
  );
}

function sceneEventToTimelineEntry(
  event: SceneEvent,
  characterMap: Record<
    string,
    Pick<CharacterDocument, "uid" | "name" | "callsign" | "profileImage">
  >
): TimelineEntry {
  const payload = event.payloadJson as Record<string, unknown>;
  const action = getPayloadText(payload, "content");
  const narrative = getPayloadText(payload, "narrative");
  const moveName = getPayloadText(payload, "moveName");
  const outcome = getPayloadText(payload, "outcome");
  const actor = event.actorId ? characterMap[event.actorId] : undefined;
  const actorName = actor
    ? actor.callsign
      ? `${actor.name} "${actor.callsign}"`
      : actor.name
    : event.actorId
    ? "Unknown character"
    : "Guide";

  return {
    id: event.id,
    kind: "event",
    title:
      moveName ||
      (event.type === "move_roll" ? "Move" : event.type.replace(/_/g, " ")),
    actor: actorName,
    actorCharacter: actor
      ? {
          id: event.actorId ?? "",
          uid: actor.uid,
          name: actor.name,
          profileImage: actor.profileImage,
        }
      : undefined,
    intent: action,
    body: narrative,
    outcome,
    createdAt: event.createdAt,
    sessionId: event.sessionId,
  };
}

function getPayloadText(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function formatSwearMoveResult(result: {
  action: number;
  challengeDice: [number, number];
  score: number;
  outcome: "hit" | "weak_hit" | "miss";
  momentumApplied: number;
}): string {
  const outcome =
    result.outcome === "hit"
      ? "Strong Hit"
      : result.outcome === "weak_hit"
      ? "Weak Hit"
      : "Miss";
  const momentum =
    result.momentumApplied > 0
      ? ` Momentum applied: +${result.momentumApplied}.`
      : "";
  return `${outcome}: action ${result.action}, score ${result.score}, challenge dice ${result.challengeDice[0]}, ${result.challengeDice[1]}.${momentum}`;
}
