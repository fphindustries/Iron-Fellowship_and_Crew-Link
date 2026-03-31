import { useCallback, useState } from "react";
import { useStore } from "stores/store";
import { firebaseAuth, projectId, functions } from "config/firebase.config";
import { AIGuideState, NarrativeRequestPayload } from "types/aiGuide.types";
import { MoveSessionEvent } from "types/SessionLog.type";
import { useAIGuideContext } from "./useAIGuideContext";
import { recordAiCall } from "stores/aiDebug";

const FUNCTION_NAME = "generateNarrative";
const DEFAULT_REGION = "us-central1";
const AUTO_NARRATE_KEY = "session-log-auto-narrate";

function getGenerateNarrativeUrl(): string {
  const emulatorOrigin = (functions as unknown as { emulatorOrigin?: string })
    .emulatorOrigin;
  if (emulatorOrigin) {
    return `${emulatorOrigin}/${projectId}/${DEFAULT_REGION}/${FUNCTION_NAME}`;
  }
  return `https://${DEFAULT_REGION}-${projectId}.cloudfunctions.net/${FUNCTION_NAME}`;
}

async function streamNarrative(
  payload: NarrativeRequestPayload,
  onChunk: (text: string) => void
): Promise<string> {
  const idToken = await firebaseAuth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Not authenticated");

  const response = await fetch(getGenerateNarrativeUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data: payload }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    streamDone = done;
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (!json) continue;
      try {
        const parsed = JSON.parse(json) as {
          message?: { text?: string };
          result?: unknown;
        };
        if (parsed.message?.text) {
          fullText += parsed.message.text;
          onChunk(fullText);
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }

  return fullText;
}

export function useAIGuide() {
  const [state, setState] = useState<AIGuideState>({
    isStreaming: false,
    narrativeText: "",
  });
  const [autoNarrate, setAutoNarrateState] = useState(
    () => localStorage.getItem(AUTO_NARRATE_KEY) === "true"
  );

  const context = useAIGuideContext();
  const activeSessionId = useStore((s) => s.sessionLog.activeSessionId);
  const updateMoveEventNarrative = useStore(
    (s) => s.sessionLog.updateMoveEventNarrative
  );
  const logJournalEvent = useStore((s) => s.sessionLog.logJournalEvent);
  const characterId = useStore(
    (s) => s.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (s) => s.campaigns.currentCampaign.currentCampaignId
  );

  const requestNarrative = useCallback(
    async (eventId: string, moveEvent: MoveSessionEvent) => {
      if (!activeSessionId || state.isStreaming) return;

      setState({ isStreaming: true, narrativeText: "", narratingEventId: eventId });

      try {
        const payload: NarrativeRequestPayload = {
          sessionId: activeSessionId,
          characterId: characterId ?? undefined,
          campaignId: campaignId ?? undefined,
          moveEvent: {
            moveName: moveEvent.moveName,
            moveId: moveEvent.moveId,
            stat: moveEvent.stat,
            statValue: moveEvent.statValue,
            playerContext: moveEvent.playerContext,
            outcome: moveEvent.outcome,
            action: moveEvent.action,
            challengeDice: moveEvent.challengeDice,
            score: moveEvent.score,
          },
          gameContext: context,
        };

        recordAiCall("Guide — Move Narrative", payload);
        const fullText = await streamNarrative(payload, (text) => {
          setState((s) => ({ ...s, narrativeText: text }));
        });

        if (fullText) {
          updateMoveEventNarrative(eventId, fullText);
        }
        setState({ isStreaming: false, narrativeText: "", narratingEventId: undefined });
      } catch (e) {
        setState({
          isStreaming: false,
          narrativeText: "",
          narratingEventId: undefined,
          error: String(e),
        });
      }
    },
    [activeSessionId, state.isStreaming, context, characterId, campaignId, updateMoveEventNarrative]
  );

  const requestFreeformNarrative = useCallback(
    async (prompt: string) => {
      if (!activeSessionId || state.isStreaming) return;

      setState({ isStreaming: true, narrativeText: "" });

      try {
        const payload: NarrativeRequestPayload = {
          sessionId: activeSessionId,
          characterId: characterId ?? undefined,
          campaignId: campaignId ?? undefined,
          prompt,
          gameContext: context,
        };

        recordAiCall("Guide — Freeform Narrative", payload);
        const fullText = await streamNarrative(payload, (text) => {
          setState((s) => ({ ...s, narrativeText: text }));
        });

        if (fullText) {
          logJournalEvent(fullText, true);
        }
        setState({ isStreaming: false, narrativeText: "" });
      } catch (e) {
        setState({ isStreaming: false, narrativeText: "", error: String(e) });
      }
    },
    [activeSessionId, state.isStreaming, context, characterId, campaignId, logJournalEvent]
  );

  // Like requestFreeformNarrative but attaches the result to a specific move event
  // card (via updateMoveEventNarrative) instead of creating a new journal entry.
  const requestNarrativeWithPrompt = useCallback(
    async (eventId: string, prompt: string) => {
      if (!activeSessionId || state.isStreaming) return;

      setState({ isStreaming: true, narrativeText: "", narratingEventId: eventId });

      try {
        const payload: NarrativeRequestPayload = {
          sessionId: activeSessionId,
          characterId: characterId ?? undefined,
          campaignId: campaignId ?? undefined,
          prompt,
          gameContext: context,
        };

        recordAiCall("Guide — Move Narrative (with Prompt)", payload);
        const fullText = await streamNarrative(payload, (text) => {
          setState((s) => ({ ...s, narrativeText: text }));
        });

        if (fullText) {
          updateMoveEventNarrative(eventId, fullText);
        }
        setState({ isStreaming: false, narrativeText: "", narratingEventId: undefined });
      } catch (e) {
        setState({
          isStreaming: false,
          narrativeText: "",
          narratingEventId: undefined,
          error: String(e),
        });
      }
    },
    [activeSessionId, state.isStreaming, context, characterId, campaignId, updateMoveEventNarrative]
  );

  const generateSummary = useCallback(
    async (eventsText: string): Promise<string> => {
      if (!activeSessionId) return "";

      const prompt = `Here are the events from this session:\n\n${eventsText}\n\nWrite a 3–5 sentence summary of this session in third person, as a narrator would describe it. Focus on the key decisions, outcomes, and dramatic moments.`;

      const payload: NarrativeRequestPayload = {
        sessionId: activeSessionId,
        characterId: characterId ?? undefined,
        campaignId: campaignId ?? undefined,
        prompt,
        gameContext: { ...context, recentEvents: [] },
      };

      recordAiCall("Guide — Session Summary", payload);
      return streamNarrative(payload, () => {});
    },
    [activeSessionId, context, characterId, campaignId]
  );

  const setAutoNarrate = useCallback((val: boolean) => {
    localStorage.setItem(AUTO_NARRATE_KEY, String(val));
    setAutoNarrateState(val);
  }, []);

  return {
    state,
    autoNarrate,
    setAutoNarrate,
    requestNarrative,
    requestFreeformNarrative,
    requestNarrativeWithPrompt,
    generateSummary,
  };
}
