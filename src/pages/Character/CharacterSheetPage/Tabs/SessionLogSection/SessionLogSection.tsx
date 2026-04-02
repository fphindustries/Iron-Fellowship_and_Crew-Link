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
  FormControlLabel,
  LinearProgress,
  Switch,
  Typography,
} from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import StarIcon from "@mui/icons-material/Star";
import SearchIcon from "@mui/icons-material/Search";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import GroupsIcon from "@mui/icons-material/Groups";
import InventoryIcon from "@mui/icons-material/Inventory";
import ExploreIcon from "@mui/icons-material/Explore";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FlagIcon from "@mui/icons-material/Flag";
import RouteIcon from "@mui/icons-material/Route";
import SportsMartialArtsIcon from "@mui/icons-material/SportsMartialArts";
import { useStore } from "stores/store";
import { useCombatTracker } from "hooks/useCombatTracker";
import { CombatTracker } from "./CombatTracker";
import { EnterTheFrayDialog } from "./EnterTheFrayDialog";
import { GainGroundDialog } from "./GainGroundDialog";
import { StrikeDialog } from "./StrikeDialog";
import { ClashDialog } from "./ClashDialog";
import { ReactUnderFireDialog } from "./ReactUnderFireDialog";
import { TakeDecisiveActionDialog } from "./TakeDecisiveActionDialog";
import { BattleDialog } from "./BattleDialog";
import { Virtuoso } from "react-virtuoso";
import { EmptyState } from "components/shared/EmptyState";
import { SessionLogEventCard } from "./SessionLogEventCard";
import { JournalInput } from "./JournalInput";
import { BeginSessionDialog, BeginSessionParams } from "./BeginSessionDialog";
import { FaceDangerDialog } from "./FaceDangerDialog";
import { SecureAnAdvantageDialog } from "./SecureAnAdvantageDialog";
import { GatherInformationDialog } from "./GatherInformationDialog";
import { CompelDialog } from "./CompelDialog";
import { AidYourAllyDialog } from "./AidYourAllyDialog";
import { CheckYourGearDialog } from "./CheckYourGearDialog";
import { UndertakeAnExpeditionDialog } from "./UndertakeAnExpeditionDialog";
import { ExploreAWaypointDialog } from "./ExploreAWaypointDialog";
import { MakeADiscoveryDialog } from "./MakeADiscoveryDialog";
import { ConfrontChaosDialog } from "./ConfrontChaosDialog";
import { FinishAnExpeditionDialog } from "./FinishAnExpeditionDialog";
import { SetACourseDialog } from "./SetACourseDialog";
import { UndertakeAJourneyDialog } from "./UndertakeAJourneyDialog";
import { ReachYourDestinationDialog } from "./ReachYourDestinationDialog";
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
  const logMoveEvent = useStore((store) => store.sessionLog.logMoveEvent);

  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const currentUid = useStore((store) => store.auth.uid);

  const {
    state: guideState,
    autoNarrate,
    setAutoNarrate,
    requestNarrative,
    requestFreeformNarrative,
    requestNarrativeWithPrompt,
    generateSummary,
  } = useAIGuide();

  const [beginDialogOpen, setBeginDialogOpen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [faceDangerOpen, setFaceDangerOpen] = useState(false);
  const [secureAdvantageOpen, setSecureAdvantageOpen] = useState(false);
  const [gatherInfoOpen, setGatherInfoOpen] = useState(false);
  const [compelOpen, setCompelOpen] = useState(false);
  const [aidAllyOpen, setAidAllyOpen] = useState(false);
  const [checkGearOpen, setCheckGearOpen] = useState(false);
  const [undertakeExpeditionOpen, setUndertakeExpeditionOpen] = useState(false);
  const [exploreWaypointOpen, setExploreWaypointOpen] = useState(false);
  const [makeDiscoveryOpen, setMakeDiscoveryOpen] = useState(false);
  const [confrontChaosOpen, setConfrontChaosOpen] = useState(false);
  const [finishExpeditionOpen, setFinishExpeditionOpen] = useState(false);
  const [setACourseOpen, setSetACourseOpen] = useState(false);
  const [undertakeJourneyOpen, setUndertakeJourneyOpen] = useState(false);
  const [reachDestinationOpen, setReachDestinationOpen] = useState(false);
  const [enterFrayOpen, setEnterFrayOpen] = useState(false);
  const [gainGroundOpen, setGainGroundOpen] = useState(false);
  const [strikeOpen, setStrikeOpen] = useState(false);
  const [clashOpen, setClashOpen] = useState(false);
  const [reactUnderFireOpen, setReactUnderFireOpen] = useState(false);
  const [takeDecisiveActionOpen, setTakeDecisiveActionOpen] = useState(false);
  const [battleOpen, setBattleOpen] = useState(false);
  const [pendingNarration, setPendingNarration] = useState<
    { eventId: string; prompt: string } | undefined
  >(undefined);

  const isSessionActive = !!activeSessionId;
  const { activeCombat } = useCombatTracker();

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

  // Auto-narrate: fire requestNarrative when a new MOVE event from current user appears.
  // We search for the latest MOVE event rather than the absolute latest event, because
  // combat dialogs append PROGRESS/COMBAT_START/COMBAT_END events after the MOVE.
  const prevLatestMoveKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!autoNarrate || !isSessionActive || guideState.isStreaming) return;

    let latestMoveKey: string | undefined;
    for (let i = orderedEventKeys.length - 1; i >= 0; i--) {
      const key = orderedEventKeys[i];
      const event = displayEvents[key];
      if (
        event.type === SESSION_EVENT_TYPE.MOVE &&
        event.uid === currentUid &&
        event.outcome !== undefined
      ) {
        latestMoveKey = key;
        break;
      }
    }

    if (!latestMoveKey || latestMoveKey === prevLatestMoveKeyRef.current) return;
    prevLatestMoveKeyRef.current = latestMoveKey;

    requestNarrative(
      latestMoveKey,
      displayEvents[latestMoveKey] as MoveSessionEvent
    ).catch(console.error);
  }, [
    orderedEventKeys,
    displayEvents,
    autoNarrate,
    isSessionActive,
    guideState.isStreaming,
    currentUid,
    requestNarrative,
  ]);

  const handleBeginSession = useCallback(
    (params: BeginSessionParams) => {
      setBeginDialogOpen(false);
      startSession({ characterId, campaignId })
        .then(async () => {
          let eventId = "";
          if (params.playerContext) {
            eventId = await logMoveEvent({
              moveId: params.moveId,
              moveName: params.moveName,
              playerContext: params.playerContext,
            });
          }
          if (params.useAiGuide && eventId && params.playerContext) {
            setPendingNarration({ eventId, prompt: params.playerContext });
          }
        })
        .catch(console.error);
    },
    [startSession, characterId, campaignId, logMoveEvent]
  );

  // Trigger narrative attached to the Begin Session move card after session is
  // active (deferred so requestNarrativeWithPrompt sees the new activeSessionId).
  useEffect(() => {
    if (!pendingNarration || !activeSessionId || guideState.isStreaming) return;
    const { eventId, prompt } = pendingNarration;
    setPendingNarration(undefined);
    requestNarrativeWithPrompt(eventId, prompt).catch(console.error);
  }, [
    pendingNarration,
    activeSessionId,
    guideState.isStreaming,
    requestNarrativeWithPrompt,
  ]);

  const buildEventsText = useCallback(() => {
    return orderedEventKeys
      .map((key) => {
        const event = events[key];
        if (!event) return null;
        switch (event.type) {
          case SESSION_EVENT_TYPE.MOVE:
            return `[Move: ${event.moveName}] ${event.playerContext ?? ""} — Outcome: ${event.outcome ?? "no roll"}${event.narrative ? ` — "${event.narrative}"` : ""}`;
          case SESSION_EVENT_TYPE.JOURNAL:
            return `[Note] ${event.text}`;
          case SESSION_EVENT_TYPE.ORACLE:
            return `[Oracle: ${event.oracleName}] ${event.result}`;
          case SESSION_EVENT_TYPE.STAT_CHANGE:
            return `[Stat Change] ${event.stat}: ${event.previousValue} → ${event.newValue}`;
          case SESSION_EVENT_TYPE.PROGRESS:
            return `[Progress] ${event.trackName}: ${event.previousValue} → ${event.newValue}`;
          default:
            return null;
        }
      })
      .filter(Boolean)
      .join("\n");
  }, [orderedEventKeys, events]);

  const handleEndSession = useCallback(() => {
    setEndingSession(true);
    const eventsText = buildEventsText();
    const doEnd = (summary?: string) =>
      endSession(summary)
        .then(() => {
          setConfirmEndOpen(false);
          setEndingSession(false);
        })
        .catch((e) => {
          console.error(e);
          setEndingSession(false);
        });

    if (eventsText) {
      generateSummary(eventsText)
        .then((summary) => doEnd(summary || undefined))
        .catch(() => doEnd());
    } else {
      doEnd();
    }
  }, [buildEventsText, endSession, generateSummary]);

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
            onClick={() => setBeginDialogOpen(true)}
          >
            Start New Session
          </Button>
        )}
      </Box>

      {/* Combat tracker panel */}
      {isSessionActive && activeCombat && <CombatTracker />}

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
                onClick={() => setBeginDialogOpen(true)}
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

      {/* Move actions + Journal input */}
      {isSessionActive && (
        <Box borderTop={1} borderColor="divider">
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            px={2}
            pt={1}
            flexWrap="wrap"
          >
            <Typography variant="caption" color="text.secondary">
              Moves:
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ShieldIcon sx={{ fontSize: 14 }} />}
              onClick={() => setFaceDangerOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Face Danger
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<StarIcon sx={{ fontSize: 14 }} />}
              onClick={() => setSecureAdvantageOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Secure an Advantage
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SearchIcon sx={{ fontSize: 14 }} />}
              onClick={() => setGatherInfoOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Gather Information
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RecordVoiceOverIcon sx={{ fontSize: 14 }} />}
              onClick={() => setCompelOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Compel
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<GroupsIcon sx={{ fontSize: 14 }} />}
              onClick={() => setAidAllyOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Aid Your Ally
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<InventoryIcon sx={{ fontSize: 14 }} />}
              onClick={() => setCheckGearOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Check Your Gear
            </Button>
          </Box>

          {/* Exploration moves */}
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            px={2}
            pt={0.5}
            pb={0.5}
            flexWrap="wrap"
          >
            <Typography variant="caption" color="text.secondary">
              Exploration:
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ExploreIcon sx={{ fontSize: 14 }} />}
              onClick={() => setUndertakeExpeditionOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Undertake an Expedition
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<TravelExploreIcon sx={{ fontSize: 14 }} />}
              onClick={() => setExploreWaypointOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Explore a Waypoint
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
              onClick={() => setMakeDiscoveryOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Make a Discovery
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
              onClick={() => setConfrontChaosOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Confront Chaos
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FlagIcon sx={{ fontSize: 14 }} />}
              onClick={() => setFinishExpeditionOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Finish an Expedition
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RouteIcon sx={{ fontSize: 14 }} />}
              onClick={() => setSetACourseOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Set a Course
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ExploreIcon sx={{ fontSize: 14 }} />}
              onClick={() => setUndertakeJourneyOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Undertake a Journey
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FlagIcon sx={{ fontSize: 14 }} />}
              onClick={() => setReachDestinationOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Reach Your Destination
            </Button>
          </Box>

          {/* Combat moves */}
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            px={2}
            pt={0.5}
            pb={0.5}
            flexWrap="wrap"
          >
            <Typography variant="caption" color="text.secondary">
              Combat:
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SportsMartialArtsIcon sx={{ fontSize: 14 }} />}
              onClick={() => setEnterFrayOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Enter the Fray
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!activeCombat}
              onClick={() => setGainGroundOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Gain Ground
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!activeCombat}
              onClick={() => setStrikeOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Strike
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!activeCombat}
              onClick={() => setClashOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Clash
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!activeCombat}
              onClick={() => setReactUnderFireOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              React Under Fire
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!activeCombat}
              onClick={() => setTakeDecisiveActionOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Take Decisive Action
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setBattleOpen(true)}
              sx={{ fontSize: "0.75rem", py: 0.25 }}
            >
              Battle
            </Button>
          </Box>

          <JournalInput
            onRequestGuide={requestFreeformNarrative}
            guideIsStreaming={guideState.isStreaming}
          />
        </Box>
      )}

      <BeginSessionDialog
        open={beginDialogOpen}
        onClose={() => setBeginDialogOpen(false)}
        onBegin={handleBeginSession}
        previousSessionSummary={mostRecentPastSession?.summary}
      />

      <FaceDangerDialog
        open={faceDangerOpen}
        onClose={() => setFaceDangerOpen(false)}
      />

      <SecureAnAdvantageDialog
        open={secureAdvantageOpen}
        onClose={() => setSecureAdvantageOpen(false)}
      />

      <GatherInformationDialog
        open={gatherInfoOpen}
        onClose={() => setGatherInfoOpen(false)}
      />

      <CompelDialog
        open={compelOpen}
        onClose={() => setCompelOpen(false)}
      />

      <AidYourAllyDialog
        open={aidAllyOpen}
        onClose={() => setAidAllyOpen(false)}
      />

      <CheckYourGearDialog
        open={checkGearOpen}
        onClose={() => setCheckGearOpen(false)}
      />

      <UndertakeAnExpeditionDialog
        open={undertakeExpeditionOpen}
        onClose={() => setUndertakeExpeditionOpen(false)}
      />

      <ExploreAWaypointDialog
        open={exploreWaypointOpen}
        onClose={() => setExploreWaypointOpen(false)}
      />

      <MakeADiscoveryDialog
        open={makeDiscoveryOpen}
        onClose={() => setMakeDiscoveryOpen(false)}
      />

      <ConfrontChaosDialog
        open={confrontChaosOpen}
        onClose={() => setConfrontChaosOpen(false)}
      />

      <FinishAnExpeditionDialog
        open={finishExpeditionOpen}
        onClose={() => setFinishExpeditionOpen(false)}
      />

      <SetACourseDialog
        open={setACourseOpen}
        onClose={() => setSetACourseOpen(false)}
      />

      <UndertakeAJourneyDialog
        open={undertakeJourneyOpen}
        onClose={() => setUndertakeJourneyOpen(false)}
      />

      <ReachYourDestinationDialog
        open={reachDestinationOpen}
        onClose={() => setReachDestinationOpen(false)}
      />

      <EnterTheFrayDialog
        open={enterFrayOpen}
        onClose={() => setEnterFrayOpen(false)}
      />
      <GainGroundDialog
        open={gainGroundOpen}
        onClose={() => setGainGroundOpen(false)}
      />
      <StrikeDialog
        open={strikeOpen}
        onClose={() => setStrikeOpen(false)}
      />
      <ClashDialog
        open={clashOpen}
        onClose={() => setClashOpen(false)}
      />
      <ReactUnderFireDialog
        open={reactUnderFireOpen}
        onClose={() => setReactUnderFireOpen(false)}
      />
      <TakeDecisiveActionDialog
        open={takeDecisiveActionOpen}
        onClose={() => setTakeDecisiveActionOpen(false)}
      />
      <BattleDialog
        open={battleOpen}
        onClose={() => setBattleOpen(false)}
      />

      {/* End session confirmation dialog */}
      <Dialog open={confirmEndOpen} onClose={() => !endingSession && setConfirmEndOpen(false)}>
        <DialogTitle>End Session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to end this session? You can start a new
            one at any time.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEndOpen(false)} disabled={endingSession}>
            Cancel
          </Button>
          <Button
            onClick={handleEndSession}
            color="error"
            variant="contained"
            disabled={endingSession}
            startIcon={endingSession ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {endingSession ? "Ending…" : "End Session"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
