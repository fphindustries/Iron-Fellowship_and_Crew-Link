import { useCallback, useEffect, useMemo, useState } from "react";
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
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useStore } from "stores/store";
import { Virtuoso } from "react-virtuoso";
import { EmptyState } from "components/shared/EmptyState";
import { SessionLogEventCard } from "pages/Character/CharacterSheetPage/Tabs/SessionLogSection/SessionLogEventCard";
import { JournalInput } from "pages/Character/CharacterSheetPage/Tabs/SessionLogSection/JournalInput";
import {
  MoveSessionEvent,
  SESSION_EVENT_TYPE,
  SessionDocument,
  SessionLogEvent,
} from "types/SessionLog.type";
import { useAIGuide } from "hooks/useAIGuide";
import {
  useSessionsListQuery,
  useSessionEventsQuery,
  useEndSessionMutation,
  sessionLogKeys,
} from "hooks/queries/useSessionLogQuery";
import { api } from "config/api.config";
import { useQueryClient } from "@tanstack/react-query";
import { CampaignType } from "types/Campaign.type";
import { useCampaignType } from "hooks/useCampaignType";
import { useNavigate } from "react-router-dom";
import { constructCampaignSheetPath, CAMPAIGN_ROUTES } from "pages/Campaign/routes";
import { SessionPreflightDialog } from "pages/Campaign/CampaignPage/components/SessionPreflightDialog";

function rowToSessionDocument(row: any): SessionDocument {
  return {
    characterId: row.characterId ?? undefined,
    campaignId: row.campaignId ?? undefined,
    startedAt: new Date(row.startedAt),
    endedAt: row.endedAt ? new Date(row.endedAt) : undefined,
    title: row.title ?? undefined,
    isActive: row.isActive,
    summary: row.summary ?? undefined,
  };
}

function rowToSessionEvent(row: any): SessionLogEvent {
  const data = row.dataJson ?? {};
  return {
    type: row.type as SESSION_EVENT_TYPE,
    sessionId: row.sessionId,
    timestamp: new Date(row.createdAt),
    characterId: row.characterId ?? null,
    characterName: row.characterName ?? "",
    uid: row.createdBy ?? "",
    ...data,
  } as SessionLogEvent;
}

export function SessionsTab() {
  const campaignId = useStore(
    (s) => s.campaigns.currentCampaign.currentCampaignId
  );
  const activeSessionId = useStore((s) => s.sessionLog.activeSessionId);
  const activeEvents = useStore((s) => s.sessionLog.events);

  const { campaignType } = useCampaignType();
  const isAIGuided = campaignType === CampaignType.AIGuided;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const endSessionMutation = useEndSessionMutation();

  const [preflightOpen, setPreflightOpen] = useState(false);

  const { data: sessionsData, isLoading: sessionsLoading } = useSessionsListQuery(
    "campaign",
    campaignId ?? undefined
  );

  const sessions: { id: string; session: SessionDocument }[] = useMemo(
    () =>
      (sessionsData ?? []).map((row: any) => ({
        id: row.id,
        session: rowToSessionDocument(row),
      })),
    [sessionsData]
  );

  const activeSession = useMemo(
    () => sessions.find((s) => s.session.isActive),
    [sessions]
  );

  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; session: SessionDocument } | undefined>(undefined);

  useEffect(() => {
    if (sessions.length === 0) return;
    setSelectedSessionId((prev) => {
      if (prev) return prev;
      const active = sessions.find((s) => s.session.isActive);
      return active?.id ?? sessions[0].id;
    });
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) setSelectedSessionId(activeSessionId);
  }, [activeSessionId]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const isSelectedActive = selectedSession?.session.isActive ?? false;

  const { data: pastEventsData } = useSessionEventsQuery(
    !isSelectedActive ? selectedSessionId : undefined
  );

  const pastEvents: { [key: string]: SessionLogEvent } = useMemo(() => {
    if (!pastEventsData) return {};
    const map: { [key: string]: SessionLogEvent } = {};
    (pastEventsData as any[]).forEach((row: any) => {
      map[row.id] = rowToSessionEvent(row);
    });
    return map;
  }, [pastEventsData]);

  const displayEvents = isSelectedActive ? activeEvents : pastEvents;

  const orderedEventKeys = useMemo(
    () =>
      Object.keys(displayEvents).sort(
        (a, b) =>
          displayEvents[a].timestamp.getTime() - displayEvents[b].timestamp.getTime()
      ),
    [displayEvents]
  );

  const { state: guideState, requestNarrative, requestFreeformNarrative } = useAIGuide();

  const handleRequestNarrative = useCallback(
    (eventId: string, event: SessionLogEvent) => {
      if (event.type === SESSION_EVENT_TYPE.MOVE) {
        requestNarrative(eventId, event as MoveSessionEvent).catch(console.error);
      }
    },
    [requestNarrative]
  );

  const handleEndSession = (sessionId: string) => {
    endSessionMutation.mutate({ sessionId }, {
      onSuccess: () => {
        useStore.setState((store) => {
          if (store.sessionLog.activeSessionId === sessionId) {
            store.sessionLog.activeSessionId = undefined;
            store.sessionLog.activeSession = undefined;
          }
        });
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget || !campaignId) return;
    api
      .del(`/api/sessions/${deleteTarget.id}`)
      .then(() => {
        qc.invalidateQueries({ queryKey: sessionLogKeys.list("campaign", campaignId) });
      })
      .catch(console.error);
    if (selectedSessionId === deleteTarget.id) {
      const remaining = sessions.filter((s) => s.id !== deleteTarget.id);
      setSelectedSessionId(remaining[0]?.id);
    }
    setDeleteTarget(undefined);
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

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
          {isAIGuided && (
            <Tooltip
              title={
                activeSession
                  ? "End the active session before starting a new one"
                  : "Start a new play session"
              }
            >
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                  onClick={() => setPreflightOpen(true)}
                  disabled={!!activeSession}
                  sx={{ fontSize: 11, py: 0.25, px: 1 }}
                >
                  New
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>

        {sessionsLoading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={20} />
          </Box>
        ) : sessions.length === 0 ? (
          <Box p={2}>
            <Typography variant="body2" color="text.secondary">
              {isAIGuided
                ? "No sessions yet. Click New to start playing."
                : "No sessions yet."}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ overflowY: "auto", flexGrow: 1 }}>
            {sessions.map(({ id, session }) => (
              <ListItemButton
                key={id}
                selected={id === selectedSessionId}
                onClick={() => setSelectedSessionId(id)}
                sx={{ flexDirection: "column", alignItems: "flex-start", py: 1, pr: 0.5 }}
              >
                <Box display="flex" width="100%" alignItems="flex-start" justifyContent="space-between">
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
                        {formatDate(session.endedAt)}
                      </Typography>
                    ) : null}
                  </Box>

                  <Box display="flex" gap={0.25} flexShrink={0} alignItems="center">
                    {session.isActive && isAIGuided && (
                      <Tooltip title="Continue in cockpit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (campaignId) {
                              navigate(constructCampaignSheetPath(campaignId, CAMPAIGN_ROUTES.PLAY));
                            }
                          }}
                          sx={{ p: 0.25 }}
                        >
                          <PlayArrowIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {session.isActive ? (
                      <Tooltip title="End session">
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEndSession(id);
                          }}
                          disabled={endSessionMutation.isPending}
                          sx={{ p: 0.25, opacity: 0.6 }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Delete session">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id, session });
                          }}
                          sx={{ p: 0.25 }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>

      {/* Event feed */}
      <Box display="flex" flexDirection="column" flexGrow={1} overflow="hidden">
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
                  onRequestNarrative={isSelectedActive ? handleRequestNarrative : undefined}
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(undefined)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete the session from{" "}
            {deleteTarget ? formatDate(deleteTarget.session.startedAt) : ""}?
            All events will be permanently lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {isAIGuided && campaignId && (
        <SessionPreflightDialog
          open={preflightOpen}
          campaignId={campaignId}
          onClose={() => setPreflightOpen(false)}
        />
      )}
    </Box>
  );
}
