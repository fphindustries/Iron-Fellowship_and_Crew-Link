import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { useStore } from "stores/store";
import { Virtuoso } from "react-virtuoso";
import { EmptyState } from "components/shared/EmptyState";
import { SessionLogEventCard } from "pages/Character/CharacterSheetPage/Tabs/SessionLogSection/SessionLogEventCard";
import { JournalInput } from "pages/Character/CharacterSheetPage/Tabs/SessionLogSection/JournalInput";
import { listenToCampaignSessions } from "api-calls/session-log/listenToCampaignSessions";
import { listenToSessionEvents } from "api-calls/session-log/listenToSessionEvents";
import { deleteSession } from "api-calls/session-log/deleteSession";
import {
  MoveSessionEvent,
  SESSION_EVENT_TYPE,
  SessionDocument,
  SessionLogEvent,
} from "types/SessionLog.type";
import { useAIGuide } from "hooks/useAIGuide";

export function SessionsTab() {
  const campaignId = useStore(
    (s) => s.campaigns.currentCampaign.currentCampaignId
  );
  const activeSessionId = useStore((s) => s.sessionLog.activeSessionId);
  const activeEvents = useStore((s) => s.sessionLog.events);
  const endSession = useStore((s) => s.sessionLog.endSession);

  // All campaign sessions list
  const [sessions, setSessions] = useState<
    { id: string; session: SessionDocument }[]
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Selected session id for browsing
  const [selectedSessionId, setSelectedSessionId] = useState<
    string | undefined
  >(undefined);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<
    { id: string; session: SessionDocument } | undefined
  >(undefined);

  // Events for a selected past session (not the active one)
  const [pastEvents, setPastEvents] = useState<{
    [key: string]: SessionLogEvent;
  }>({});
  const pastEventsUnsubRef = useRef<(() => void) | undefined>(undefined);

  // Subscribe to all campaign sessions list
  useEffect(() => {
    if (!campaignId) return;
    const unsub = listenToCampaignSessions({
      campaignId,
      onUpdate: (s) => {
        setSessions(s);
        setSessionsLoading(false);
      },
      onError: (e) => {
        console.error(e);
        setSessionsLoading(false);
      },
    });
    return () => unsub();
  }, [campaignId]);

  // Default selection: active session, else first session
  useEffect(() => {
    if (sessions.length === 0) return;
    setSelectedSessionId((prev) => {
      if (prev) return prev;
      const active = sessions.find((s) => s.session.isActive);
      return active?.id ?? sessions[0].id;
    });
  }, [sessions]);

  // When an active session appears, switch to it
  useEffect(() => {
    if (activeSessionId) {
      setSelectedSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  // Subscribe to past session events when viewing a non-active session
  useEffect(() => {
    if (!selectedSessionId || !campaignId) return;
    if (selectedSessionId === activeSessionId) {
      if (pastEventsUnsubRef.current) {
        pastEventsUnsubRef.current();
        pastEventsUnsubRef.current = undefined;
      }
      setPastEvents({});
      return;
    }

    setPastEvents({});
    const unsub = listenToSessionEvents({
      sessionId: selectedSessionId,
      campaignId,
      totalEventsToLoad: 200,
      updateEvent: (eventId, event) => {
        setPastEvents((prev) => ({ ...prev, [eventId]: event }));
      },
      removeEvent: (eventId) => {
        setPastEvents((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
      },
      onError: console.error,
    });

    if (pastEventsUnsubRef.current) {
      pastEventsUnsubRef.current();
    }
    pastEventsUnsubRef.current = unsub;

    return () => {
      unsub();
      pastEventsUnsubRef.current = undefined;
    };
  }, [selectedSessionId, activeSessionId, campaignId]);

  const isSelectedActive = selectedSessionId === activeSessionId;
  const displayEvents = isSelectedActive ? activeEvents : pastEvents;

  const orderedEventKeys = useMemo(
    () =>
      Object.keys(displayEvents).sort(
        (a, b) =>
          displayEvents[a].timestamp.getTime() -
          displayEvents[b].timestamp.getTime()
      ),
    [displayEvents]
  );

  const { state: guideState, requestNarrative, requestFreeformNarrative } =
    useAIGuide();

  const handleRequestNarrative = useCallback(
    (eventId: string, event: SessionLogEvent) => {
      if (event.type === SESSION_EVENT_TYPE.MOVE) {
        requestNarrative(eventId, event as MoveSessionEvent).catch(
          console.error
        );
      }
    },
    [requestNarrative]
  );

  const handleDeleteConfirm = () => {
    if (!deleteTarget || !campaignId) return;
    deleteSession({ sessionId: deleteTarget.id, campaignId }).catch(
      console.error
    );
    // If the deleted session was selected, move selection to first remaining
    if (selectedSessionId === deleteTarget.id) {
      const remaining = sessions.filter((s) => s.id !== deleteTarget.id);
      setSelectedSessionId(remaining[0]?.id);
    }
    setDeleteTarget(undefined);
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <Box display="flex" height="100%" overflow="hidden">
      {/* Session list sidebar */}
      <Box
        width={220}
        minWidth={220}
        borderRight={1}
        borderColor="divider"
        display="flex"
        flexDirection="column"
        overflow="hidden"
      >
        <Box
          px={1.5}
          py={1}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          borderBottom={1}
          borderColor="divider"
        >
          <Typography variant="subtitle2">Sessions</Typography>
          {activeSessionId && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => endSession().catch(console.error)}
            >
              End
            </Button>
          )}
        </Box>

        {sessionsLoading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={20} />
          </Box>
        ) : sessions.length === 0 ? (
          <Box p={2}>
            <Typography variant="body2" color="textSecondary">
              No sessions yet. Start one from your character sheet.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ overflowY: "auto", flexGrow: 1 }}>
            {sessions.map(({ id, session }) => (
              <ListItemButton
                key={id}
                selected={id === selectedSessionId}
                onClick={() => setSelectedSessionId(id)}
                sx={{
                  flexDirection: "column",
                  alignItems: "flex-start",
                  py: 1,
                  pr: 0.5,
                }}
              >
                <Box
                  display="flex"
                  width="100%"
                  alignItems="flex-start"
                  justifyContent="space-between"
                >
                  <Box flexGrow={1} minWidth={0}>
                    <Typography
                      variant="caption"
                      fontWeight={session.isActive ? 700 : 400}
                      sx={{ lineHeight: 1.3, display: "block" }}
                    >
                      {session.title ?? formatDate(session.startedAt)}
                    </Typography>
                    {session.isActive ? (
                      <Typography variant="caption" color="success.main">
                        Active
                      </Typography>
                    ) : session.endedAt ? (
                      <Typography variant="caption" color="text.disabled">
                        Ended {formatDate(session.endedAt)}
                      </Typography>
                    ) : null}
                  </Box>
                  {!session.isActive && (
                    <Tooltip title="Delete session">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id, session });
                        }}
                        sx={{ p: 0.25, flexShrink: 0 }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>

      {/* Event feed */}
      <Box
        display="flex"
        flexDirection="column"
        flexGrow={1}
        overflow="hidden"
      >
        {!selectedSessionId ? (
          <EmptyState message="Select a session to view its events." />
        ) : orderedEventKeys.length === 0 ? (
          <EmptyState
            message={
              isSelectedActive
                ? "Session is active. Events will appear here as you play."
                : "No events recorded in this session."
            }
          />
        ) : (
          <Box flexGrow={1} overflow="hidden">
            <Virtuoso
              data={orderedEventKeys}
              itemContent={(_index, eventId) => (
                <SessionLogEventCard
                  key={eventId}
                  eventId={eventId}
                  event={displayEvents[eventId]}
                  onRequestNarrative={
                    isSelectedActive ? handleRequestNarrative : undefined
                  }
                  narratingEventId={guideState.narratingEventId}
                  streamingNarrativeText={guideState.narrativeText}
                />
              )}
            />
          </Box>
        )}

        {isSelectedActive && (
          <Box borderTop={1} borderColor="divider">
            <JournalInput
              onRequestGuide={requestFreeformNarrative}
              guideIsStreaming={guideState.isStreaming}
            />
          </Box>
        )}
      </Box>

      {/* Delete session confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete the session from{" "}
            {deleteTarget
              ? formatDate(deleteTarget.session.startedAt)
              : ""}
            ? All events in this session will be permanently lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
