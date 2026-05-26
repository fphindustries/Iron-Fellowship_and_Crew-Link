import { Box, Card, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { SessionLogEvent, SESSION_EVENT_TYPE } from "types/SessionLog.type";
import { MoveEventCard } from "./eventCards/MoveEventCard";
import { OracleEventCard } from "./eventCards/OracleEventCard";
import { StatChangeEventCard } from "./eventCards/StatChangeEventCard";
import { ProgressEventCard } from "./eventCards/ProgressEventCard";
import { JournalEventCard } from "./eventCards/JournalEventCard";
import { CombatStartEventCard } from "./eventCards/CombatStartEventCard";
import { CombatEndEventCard } from "./eventCards/CombatEndEventCard";
import { PortraitAvatar } from "components/features/characters/PortraitAvatar/PortraitAvatar";
import { useStore } from "stores/store";

export interface SessionLogEventCardProps {
  eventId: string;
  event: SessionLogEvent;
  onRequestNarrative?: (eventId: string, event: SessionLogEvent) => void;
  narratingEventId?: string;
  streamingNarrativeText?: string;
}

function getTimeString(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SessionLogEventCard(props: SessionLogEventCardProps) {
  const { eventId, event, onRequestNarrative, narratingEventId, streamingNarrativeText } = props;

  const currentUid = useStore((s) => s.auth.uid);
  const deleteEvent = useStore((s) => s.sessionLog.deleteEvent);
  const activeSessionId = useStore((s) => s.sessionLog.activeSessionId);

  // Resolve portrait from whichever character map has this character
  const characterDoc = useStore((s) => {
    if (!event.characterId) return undefined;
    return (
      s.characters.characterMap[event.characterId] ??
      s.campaigns.currentCampaign.characters.characterMap[event.characterId]
    );
  });

  const canDelete = event.uid === currentUid && !!activeSessionId;

  return (
    <Box px={2} py={0.5}>
      <Card variant="outlined" sx={{ p: 1.5 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={0.5}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {event.characterId && characterDoc && (
              <PortraitAvatar
                uid={characterDoc.uid}
                characterId={event.characterId}
                name={characterDoc.name}
                portraitSettings={characterDoc.profileImage ?? undefined}
                size="small"
                colorful
                rounded
              />
            )}
            <Typography variant="subtitle2">
              {event.characterName || "Unknown"}
            </Typography>
            <EventTypeBadge type={event.type} />
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="caption" color="textSecondary">
              {getTimeString(event.timestamp)}
            </Typography>
            {canDelete && (
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={() => deleteEvent(eventId)}
                  sx={{ p: 0.25 }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        <EventContent
          eventId={eventId}
          event={event}
          onRequestNarrative={onRequestNarrative}
          narratingEventId={narratingEventId}
          streamingNarrativeText={streamingNarrativeText}
        />
      </Card>
    </Box>
  );
}

function EventTypeBadge({ type }: { type: SESSION_EVENT_TYPE }) {
  const labelMap: Record<SESSION_EVENT_TYPE, string> = {
    [SESSION_EVENT_TYPE.MOVE]: "move",
    [SESSION_EVENT_TYPE.ORACLE]: "oracle",
    [SESSION_EVENT_TYPE.STAT_CHANGE]: "stat change",
    [SESSION_EVENT_TYPE.PROGRESS]: "progress",
    [SESSION_EVENT_TYPE.JOURNAL]: "note",
    [SESSION_EVENT_TYPE.COMBAT_START]: "combat start",
    [SESSION_EVENT_TYPE.COMBAT_END]: "combat end",
  };

  const colorMap: Record<
    SESSION_EVENT_TYPE,
    "primary" | "secondary" | "warning" | "info" | "success"
  > = {
    [SESSION_EVENT_TYPE.MOVE]: "primary",
    [SESSION_EVENT_TYPE.ORACLE]: "secondary",
    [SESSION_EVENT_TYPE.STAT_CHANGE]: "warning",
    [SESSION_EVENT_TYPE.PROGRESS]: "info",
    [SESSION_EVENT_TYPE.JOURNAL]: "success",
    [SESSION_EVENT_TYPE.COMBAT_START]: "warning",
    [SESSION_EVENT_TYPE.COMBAT_END]: "primary",
  };

  return (
    <Chip
      label={labelMap[type]}
      size="small"
      color={colorMap[type]}
      variant="outlined"
      sx={{ height: 20, fontSize: "0.7rem" }}
    />
  );
}

function EventContent({
  eventId,
  event,
  onRequestNarrative,
  narratingEventId,
  streamingNarrativeText,
}: {
  eventId: string;
  event: SessionLogEvent;
  onRequestNarrative?: (eventId: string, event: SessionLogEvent) => void;
  narratingEventId?: string;
  streamingNarrativeText?: string;
}) {
  switch (event.type) {
    case SESSION_EVENT_TYPE.MOVE:
      return (
        <MoveEventCard
          event={event}
          onRequestNarrative={
            onRequestNarrative
              ? () => onRequestNarrative(eventId, event)
              : undefined
          }
          streamingNarrative={
            narratingEventId === eventId ? streamingNarrativeText : undefined
          }
        />
      );
    case SESSION_EVENT_TYPE.ORACLE:
      return <OracleEventCard event={event} />;
    case SESSION_EVENT_TYPE.STAT_CHANGE:
      return <StatChangeEventCard event={event} />;
    case SESSION_EVENT_TYPE.PROGRESS:
      return <ProgressEventCard event={event} />;
    case SESSION_EVENT_TYPE.JOURNAL:
      return <JournalEventCard event={event} />;
    case SESSION_EVENT_TYPE.COMBAT_START:
      return <CombatStartEventCard event={event} />;
    case SESSION_EVENT_TYPE.COMBAT_END:
      return <CombatEndEventCard event={event} />;
  }
}
