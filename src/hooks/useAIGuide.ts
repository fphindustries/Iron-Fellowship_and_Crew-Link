import { useCallback, useState } from "react";
import { useStore } from "stores/store";
import { AIGuideState, NarrativeGameContext, NarrativeRequestPayload } from "types/aiGuide.types";
import { MoveSessionEvent } from "types/SessionLog.type";
import { useAIGuideContext } from "./useAIGuideContext";
import { recordAiCall, AiDebugFullPrompt, useAiDebugStore } from "stores/aiDebug";
import { streamNarrative } from "api/ai/streamNarrative";
import {
  useAddSessionEventMutation,
  useUpdateSessionEventMutation,
} from "hooks/queries/useSessionLogQuery";
import { SESSION_EVENT_TYPE, SessionLogEvent } from "types/SessionLog.type";

const AUTO_NARRATE_KEY = "session-log-auto-narrate";

// Mirrors the ROLE_BLOCK constant in functions/src/aiGuide.ts — kept in sync for prompt logging.
export const GUIDE_ROLE_BLOCK = `You are the Guide — the narrative voice of a solo or co-op tabletop RPG session in the Ironsworn or Starforged universe. Your role is to respond to player moves and dice outcomes with vivid, immersive story beats that honour the mechanical result while breathing life into the fiction.

Rules you must follow:
- Write in third person ("She...", "He...", "They...", or use the character's name)
- Always honour the outcome: Strong Hit = genuine success, Weak Hit = success with cost/complication, Miss = failure or danger
- Write 5–8 evocative sentences — paint a vivid picture with sensory detail, emotional resonance, and narrative consequence
- Avoid clichés; favour specific sensory details over vague descriptions
- Never introduce new plot elements the player hasn't established
- Do not repeat the move name or outcome label verbatim
- Match the tone of the world: Ironsworn is grim Norse-inspired; Starforged is dark science fiction`;

export const GUIDE_DEFAULT_MODEL = "claude-haiku-4-5-20251001";
export const GUIDE_DEFAULT_MAX_TOKENS = 700;

function buildGameContextBlock(gameContext: NarrativeGameContext): string {
  const lines: string[] = [];
  const callsignPart = gameContext.callsign ? ` — "${gameContext.callsign}"` : "";
  const pronounsPart = gameContext.characterPronouns ? ` (${gameContext.characterPronouns})` : "";
  lines.push(`Character: ${gameContext.characterName}${callsignPart}${pronounsPart}`);
  if (gameContext.characteristics) lines.push(`Characteristics: ${gameContext.characteristics}`);
  if (gameContext.worldTruths.length > 0) {
    lines.push("\nWorld Truths:");
    gameContext.worldTruths.forEach((t) => lines.push(`  - ${t}`));
  }
  if (gameContext.characterAssets.length > 0) {
    lines.push("\nCharacter Assets:");
    gameContext.characterAssets.forEach((a) => lines.push(`  - ${a}`));
  }
  if (gameContext.campaignCharacterNames && gameContext.campaignCharacterNames.length > 0) {
    lines.push(`\nCampaign companions: ${gameContext.campaignCharacterNames.join(", ")}`);
  }
  return lines.join("\n");
}

function buildCombatBlock(gameContext: NarrativeGameContext): string {
  if (!gameContext.activeCombat) return "";
  const { objective, enemies, position } = gameContext.activeCombat;
  const positionLabel = position === "in_control" ? "In Control" : "In a Bad Spot";
  const lines = ["\n## Active Combat", `Objective: ${objective}`];
  if (enemies.length > 0) lines.push(`Enemies: ${enemies.join(", ")}`);
  lines.push(`Position: ${positionLabel}`);
  return lines.join("\n");
}

function buildMoveUserMessage(
  moveEvent: NarrativeRequestPayload["moveEvent"],
  gameContext: NarrativeGameContext
): string {
  if (!moveEvent) return "";
  const lines: string[] = [];
  const statPart =
    moveEvent.stat && moveEvent.statValue !== undefined
      ? ` using ${moveEvent.stat} (${moveEvent.statValue})`
      : "";
  const scorePart =
    moveEvent.score !== undefined && moveEvent.challengeDice
      ? ` — action score ${moveEvent.score} vs [${moveEvent.challengeDice[0]}, ${moveEvent.challengeDice[1]}]`
      : "";
  lines.push(`Move: ${moveEvent.moveName}${statPart}${scorePart}`);
  lines.push(`Outcome: ${moveEvent.outcome}`);
  if (moveEvent.playerContext) lines.push(`Player's intent: "${moveEvent.playerContext}"`);
  if (gameContext.previousSessionSummary) {
    lines.push(`\nPrevious session (now concluded):\n${gameContext.previousSessionSummary}`);
  }
  if (gameContext.recentEvents.length > 0) {
    lines.push("\nCurrent session events so far (chronological):");
    gameContext.recentEvents.forEach((e) => lines.push(`  - ${e}`));
  }
  const combatBlock = buildCombatBlock(gameContext);
  if (combatBlock) lines.push(combatBlock);
  lines.push(
    "\nWrite a vivid 5–8 sentence story beat in third person that honours this outcome. Ground the narrative in the current session events above. The previous session is backstory only — do not treat it as the current scene."
  );
  return lines.join("\n");
}

function buildPromptUserMessage(prompt: string, gameContext: NarrativeGameContext): string {
  const lines: string[] = [];
  if (gameContext.previousSessionSummary) {
    lines.push(`Previous session (now concluded):\n${gameContext.previousSessionSummary}`);
    lines.push("");
  }
  if (gameContext.recentEvents.length > 0) {
    lines.push("Current session events so far (chronological):");
    gameContext.recentEvents.forEach((e) => lines.push(`  - ${e}`));
    lines.push("");
  }
  const combatBlock = buildCombatBlock(gameContext);
  if (combatBlock) {
    lines.push(combatBlock);
    lines.push("");
  }
  lines.push(
    `Player prompt: "${prompt}"\n\nWrite a vivid 5–8 sentence story beat in third person inspired by this prompt. Ground the narrative in the current session events above. The previous session is backstory only — do not treat it as the current scene.`
  );
  return lines.join("\n");
}

function buildFullPrompt(payload: NarrativeRequestPayload): AiDebugFullPrompt {
  const contextBlock = buildGameContextBlock(payload.gameContext);
  const userMessage = payload.moveEvent
    ? buildMoveUserMessage(payload.moveEvent, payload.gameContext)
    : buildPromptUserMessage(payload.prompt ?? "", payload.gameContext);
  return {
    systemBlocks: [GUIDE_ROLE_BLOCK, contextBlock],
    userMessage,
    model: GUIDE_DEFAULT_MODEL,
    maxTokens: GUIDE_DEFAULT_MAX_TOKENS,
  };
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
  const sessionEvents = useStore((s) => s.sessionLog.events);
  const updateSessionEvent = useUpdateSessionEventMutation();
  const addSessionEvent = useAddSessionEventMutation();
  const characterId = useStore(
    (s) => s.characters.currentCharacter.currentCharacterId
  );
  const characterName = useStore(
    (s) => s.characters.currentCharacter.currentCharacter?.name ?? ""
  );
  const uid = useStore((s) => s.auth.uid ?? "");
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

        const logPromptEnabled = useAiDebugStore.getState().logPromptEnabled;
        recordAiCall(
          "Guide — Move Narrative",
          payload,
          logPromptEnabled ? buildFullPrompt(payload) : undefined
        );
        const fullText = await streamNarrative(payload, (text) => {
          setState((s) => ({ ...s, narrativeText: text }));
        });

        if (fullText) {
          await updateSessionEvent.mutateAsync({
            sessionId: activeSessionId,
            eventId,
            dataJson: { ...moveEvent, narrative: fullText },
          });
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
    [activeSessionId, state.isStreaming, context, characterId, campaignId, updateSessionEvent]
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

        const logPromptEnabled = useAiDebugStore.getState().logPromptEnabled;
        recordAiCall(
          "Guide — Freeform Narrative",
          payload,
          logPromptEnabled ? buildFullPrompt(payload) : undefined
        );
        const fullText = await streamNarrative(payload, (text) => {
          setState((s) => ({ ...s, narrativeText: text }));
        });

        if (fullText) {
          const event: SessionLogEvent = {
            type: SESSION_EVENT_TYPE.JOURNAL,
            text: fullText,
            isAiGenerated: true,
            sessionId: activeSessionId,
            timestamp: new Date(),
            characterId: characterId ?? null,
            characterName,
            uid,
          };
          await addSessionEvent.mutateAsync({ sessionId: activeSessionId, event });
        }
        setState({ isStreaming: false, narrativeText: "" });
      } catch (e) {
        setState({ isStreaming: false, narrativeText: "", error: String(e) });
      }
    },
    [
      activeSessionId,
      state.isStreaming,
      context,
      characterId,
      campaignId,
      characterName,
      uid,
      addSessionEvent,
    ]
  );

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

        const logPromptEnabled = useAiDebugStore.getState().logPromptEnabled;
        recordAiCall(
          "Guide — Move Narrative (with Prompt)",
          payload,
          logPromptEnabled ? buildFullPrompt(payload) : undefined
        );
        const fullText = await streamNarrative(payload, (text) => {
          setState((s) => ({ ...s, narrativeText: text }));
        });

        if (fullText) {
          const existingEvent = sessionEvents[eventId];
          if (existingEvent) {
            await updateSessionEvent.mutateAsync({
              sessionId: activeSessionId,
              eventId,
              dataJson: { ...existingEvent, narrative: fullText },
            });
          }
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
    [
      activeSessionId,
      state.isStreaming,
      context,
      characterId,
      campaignId,
      sessionEvents,
      updateSessionEvent,
    ]
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

      const logPromptEnabled = useAiDebugStore.getState().logPromptEnabled;
      recordAiCall(
        "Guide — Session Summary",
        payload,
        logPromptEnabled ? buildFullPrompt(payload) : undefined
      );
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
