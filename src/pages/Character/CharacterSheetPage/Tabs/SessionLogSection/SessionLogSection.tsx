import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Switch,
  Typography,
} from "@mui/material";
import { useStore } from "stores/store";
import { Virtuoso } from "react-virtuoso";
import { EmptyState } from "components/shared/EmptyState";
import { SessionLogEventCard } from "./SessionLogEventCard";
import { JournalInput } from "./JournalInput";
import { useAIGuide } from "hooks/useAIGuide";
import { MoveSessionEvent, SESSION_EVENT_TYPE, SessionLogEvent } from "types/SessionLog.type";

const MAX_ITEMS = 1000000000;

export function SessionLogSection() {
  const activeSessionId = useStore(
    (store) => store.sessionLog.activeSessionId
  );
  const activeSession = useStore((store) => store.sessionLog.activeSession);
  const events = useStore((store) => store.sessionLog.events);
  const loading = useStore((store) => store.sessionLog.loading);
  const mostRecentPastSession = useStore(
    (store) => store.sessionLog.mostRecentPastSession
  );
  const mostRecentPastSessionEvents = useStore(
    (store) => store.sessionLog.mostRecentPastSessionEvents
  );

  const startSession = useStore((store) => store.sessionLog.startSession);
  const endSession = useStore((store) => store.sessionLog.endSession);
  const loadMoreEvents = useStore((store) => store.sessionLog.loadMoreEvents);

  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const currentUid = useStore((store) => store.auth.uid);

  const { state: guideState, autoNarrate, setAutoNarrate, requestNarrative, requestFreeformNarrative } =
    useAIGuide();

  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const isSessionActive = !!activeSessionId;

  const displayEvents = isSessionActive
    ? events
    : mostRecentPastSessionEvents;

  const orderedEventKeys = useMemo(() => {
    return Object.keys(displayEvents).sort(
      (a, b) =>
        displayEvents[a].timestamp.getTime() -
        displayEvents[b].timestamp.getTime()
    );
  }, [displayEvents]);

  const eventCount = orderedEventKeys.length;

  const hasEvents = eventCount > 0;
  const handleLoadMore = useCallback(() => {
    if (hasEvents) {
      loadMoreEvents();
    }
  }, [loadMoreEvents, hasEvents]);

  const [firstItemIndex, setFirstItemIndex] = useState(MAX_ITEMS);

  useEffect(() => {
    setFirstItemIndex(MAX_ITEMS - eventCount);
  }, [eventCount]);

  // Auto-narrate: fire requestNarrative when a new MOVE event from current user appears
  const prevEventCountRef = useRef(0);
  useEffect(() => {
    if (!autoNarrate || !isSessionActive || guideState.isStreaming) return;
    if (eventCount <= prevEventCountRef.current) {
      prevEventCountRef.current = eventCount;
      return;
    }
    prevEventCountRef.current = eventCount;

    const latestKey = orderedEventKeys[orderedEventKeys.length - 1];
    if (!latestKey) return;
    const latestEvent = displayEvents[latestKey];
    if (
      latestEvent.type === SESSION_EVENT_TYPE.MOVE &&
      latestEvent.uid === currentUid
    ) {
      requestNarrative(latestKey, latestEvent as MoveSessionEvent).catch(
        console.error
      );
    }
  }, [
    eventCount,
    orderedEventKeys,
    displayEvents,
    autoNarrate,
    isSessionActive,
    guideState.isStreaming,
    currentUid,
    requestNarrative,
  ]);

  const handleStartSession = () => {
    startSession({ characterId, campaignId }).catch(console.error);
  };

  const handleEndSession = () => {
    endSession()
      .then(() => setConfirmEndOpen(false))
      .catch(console.error);
  };

  const getSessionDateString = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const hasNoSessions = !isSessionActive && !mostRecentPastSession;

  const handleRequestNarrative = useCallback(
    (eventId: string, event: SessionLogEvent) => {
      if (event.type === SESSION_EVENT_TYPE.MOVE) {
        requestNarrative(eventId, event).catch(console.error);
      }
    },
    [requestNarrative]
  );

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      minHeight={400}
    >
      {/* Top bar */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        py={1}
        borderBottom={1}
        borderColor="divider"
        gap={1}
        flexWrap="wrap"
      >
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          {isSessionActive && activeSession && (
            <Typography variant="subtitle2" color="textSecondary">
              Session started{" "}
              {getSessionDateString(activeSession.startedAt)}
            </Typography>
          )}
          {!isSessionActive && mostRecentPastSession && (
            <Typography variant="subtitle2" color="textSecondary">
              Last session:{" "}
              {getSessionDateString(mostRecentPastSession.startedAt)}
            </Typography>
          )}
          {isSessionActive && (
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={autoNarrate}
                  onChange={(e) => setAutoNarrate(e.target.checked)}
                />
              }
              label={
                <Typography variant="caption">Auto-narrate</Typography>
              }
              sx={{ ml: 0, mr: 0 }}
            />
          )}
        </Box>
        {isSessionActive ? (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => setConfirmEndOpen(true)}
          >
            End Session
          </Button>
        ) : (
          <Button
            variant="contained"
            size="small"
            onClick={handleStartSession}
          >
            Start New Session
          </Button>
        )}
      </Box>

      {/* Feed */}
      <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
        {loading && <LinearProgress />}
        {hasNoSessions ? (
          <EmptyState
            title="No Sessions Yet"
            message="Start a session to begin logging your adventure."
            callToAction={
              <Button
                variant="contained"
                size="large"
                onClick={handleStartSession}
              >
                Start First Session
              </Button>
            }
          />
        ) : hasEvents ? (
          <Virtuoso
            firstItemIndex={firstItemIndex}
            initialTopMostItemIndex={MAX_ITEMS - 1}
            data={orderedEventKeys}
            startReached={handleLoadMore}
            itemContent={(index, eventId) => (
              <SessionLogEventCard
                key={eventId}
                eventId={eventId}
                event={displayEvents[eventId]}
                onRequestNarrative={
                  isSessionActive ? handleRequestNarrative : undefined
                }
                narratingEventId={guideState.narratingEventId}
                streamingNarrativeText={guideState.narrativeText}
              />
            )}
          />
        ) : (
          <EmptyState
            message={
              isSessionActive
                ? "Your session is active. Events will appear here as you play."
                : "No events recorded in this session."
            }
          />
        )}
      </Box>

      {/* Journal input */}
      {isSessionActive && (
        <Box borderTop={1} borderColor="divider">
          <JournalInput
            onRequestGuide={requestFreeformNarrative}
            guideIsStreaming={guideState.isStreaming}
          />
        </Box>
      )}

      {/* End session confirmation dialog */}
      <Dialog open={confirmEndOpen} onClose={() => setConfirmEndOpen(false)}>
        <DialogTitle>End Session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to end this session? You can start a new
            one at any time.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEndOpen(false)}>Cancel</Button>
          <Button onClick={handleEndSession} color="error" variant="contained">
            End Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
