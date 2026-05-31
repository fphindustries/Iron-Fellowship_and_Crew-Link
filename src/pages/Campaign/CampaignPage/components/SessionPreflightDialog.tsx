import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import CasinoIcon from "@mui/icons-material/Casino";
import { useNavigate } from "react-router-dom";
import { useStore } from "stores/store";
import {
  useCampaignStarshipQuery,
  useCreateCampaignTrackMutation,
} from "hooks/queries/useCampaignsQuery";
import { useUpdateCharacterMutation } from "hooks/queries/useCharactersQuery";
import { useUpdateNPCMutation } from "hooks/queries/useWorldEntitiesQuery";
import { constructCampaignSheetPath, CAMPAIGN_ROUTES } from "pages/Campaign/routes";
import { useGameSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { useNewMaps } from "hooks/featureFlags/useNewMaps";
import { defaultAIGuideState, LaunchSetupState } from "types/AIGuideState.type";
import { Difficulty, TrackStatus, TrackTypes } from "types/Track.type";
import { ROLL_RESULT } from "types/DieRolls.type";
import { getRoll } from "stores/appState/useRoller";
import { useRoller } from "stores/appState/useRoller";
import { momentumTrack } from "data/defaultTracks";
import { generateLaunchIncidentStream } from "api/ai/generateLaunchIncident";
import { generateLaunchOpeningSceneStream } from "api/ai/generateLaunchOpeningScene";
import { generateLaunchVowStream } from "api/ai/generateLaunchVow";
import { api } from "config/api.config";
import {
  LaunchCampaignContext,
  LaunchIncidentSource,
  LaunchIncidentSourceKey,
} from "types/AI.type";
import {
  buildBaseCampaignContext,
  buildGuideStateContext,
} from "hooks/buildAiCampaignContext";
import { Truth } from "types/World.type";

interface Check {
  label: string;
  passed: boolean;
  hint: string;
}

interface SessionPreflightDialogProps {
  open: boolean;
  campaignId: string;
  onClose: () => void;
  forceLaunchSetup?: boolean;
}

const STEPS = ["Requirements", "Incident", "Scene", "Vow", "Swear"];
const SWEAR_IRON_VOW_MOVE_ID = "starforged/moves/quest/swear_an_iron_vow";
const CUSTOM_TRUTH_INDEX = -1;

const STARTER_INCIDENTS = [
  "Aid a starship caught in a spacetime fracture.",
  "Broker peace between two feuding settlements.",
  "Chart a new passage between isolated settlements.",
  "Defend the people of a beleaguered settlement against raiders.",
  "Discover who sabotaged a settlement's air processors.",
  "Escort a tradeship carrying prized cargo.",
  "Ferry a rescue team to a perilous disaster site.",
  "Infiltrate a fortified base to steal crucial data.",
  "Investigate terrifying manifestations at a remote settlement.",
  "Liberate prisoners at a cruel labor camp.",
  "Locate a downed spacer on an uninhabited planet.",
  "Protect a fugitive from a relentless bounty hunter.",
  "Recover a cherished pre-exodus artifact from an enemy.",
  "Rescue a starship crew held captive by mutineers.",
  "Retrieve a cache of stolen weapons from a pirate ship.",
  "Sabotage an enemy installation.",
  "Search for a missing expedition in the depths of a precursor vault.",
  "Shield a wondrous lifeform from those who seek to destroy it.",
  "Track and slay a marauding beast.",
  "Transport a displaced people to their new home.",
];

const LAUNCH_INCIDENT_SOURCES: LaunchIncidentSource[] = [
  {
    key: "truthsSelected",
    label: "Selected truths",
    rulebookPrompt:
      "Which factions, conflicts, or dangers from the selected truths offer an opportunity for adventure?",
  },
  {
    key: "truthsQuestStarters",
    label: "Truth quest starters",
    rulebookPrompt:
      "Use a quest starter implied by the campaign truths as inspiration for the adventure.",
  },
  {
    key: "characterPaths",
    label: "Character paths",
    rulebookPrompt:
      "Do the characters have duties, skills, or goals that lend themselves to a quest?",
  },
  {
    key: "characterBackstory",
    label: "Character backstory",
    rulebookPrompt:
      "Does a character backstory imply an immediate danger or goal that must be dealt with?",
  },
  {
    key: "starship",
    label: "Starship",
    rulebookPrompt:
      "Is the starship in need of anything, or does its history create trouble for the crew?",
  },
  {
    key: "team",
    label: "Team",
    rulebookPrompt:
      "Do the protagonists have shared or complementary goals that can pull everyone into the same vow?",
  },
  {
    key: "settlements",
    label: "Settlements",
    rulebookPrompt:
      "Do any settlement aspects, projects, or troubles create an opportunity for a quest?",
  },
  {
    key: "connection",
    label: "Connection",
    rulebookPrompt:
      "Based on a connection's role or goal, does that connection need something from the protagonists?",
  },
  {
    key: "sectorTrouble",
    label: "Sector trouble",
    rulebookPrompt:
      "Does the trouble in this sector, or some aspect of it, need to be dealt with?",
  },
  {
    key: "actionTheme",
    label: "Action and Theme",
    rulebookPrompt:
      "Use Action and Theme oracle results, then embellish them in the context of the established setting.",
  },
  {
    key: "characterGoal",
    label: "Character Goal",
    rulebookPrompt:
      "Use a Character Goal oracle result, then make it relevant to a character or connection.",
  },
  {
    key: "starterTable",
    label: "Starter table",
    rulebookPrompt:
      "Use a result from the page 130 starter table, adjusted to the established character and setting.",
  },
];

interface TruthDefinition {
  name?: string;
  options?: Array<{
    description?: string;
  }>;
}

function resultKey(outcome: ROLL_RESULT): LaunchSetupState["swearMoveResult"]["outcome"] {
  if (outcome === ROLL_RESULT.HIT) return "hit";
  if (outcome === ROLL_RESULT.WEAK_HIT) return "weak_hit";
  return "miss";
}

function resultLabel(outcome: ROLL_RESULT): string {
  if (outcome === ROLL_RESULT.HIT) return "Strong Hit";
  if (outcome === ROLL_RESULT.WEAK_HIT) return "Weak Hit";
  return "Miss";
}

function nextStepPrompt(outcome: ROLL_RESULT): string {
  if (outcome === ROLL_RESULT.HIT) {
    return "Your next steps are clear. Envision the immediate lead, destination, or action that starts the quest.";
  }
  if (outcome === ROLL_RESULT.WEAK_HIT) {
    return "You begin with more questions than answers. Envision what you do to find a path forward.";
  }
  return "A significant obstacle stands in your way. Envision the danger, demand, or revelation you must overcome before the quest can truly begin.";
}

function pickLaunchIncidentSource(
  previousSource?: LaunchIncidentSourceKey
): LaunchIncidentSource {
  const options =
    LAUNCH_INCIDENT_SOURCES.length > 1 && previousSource
      ? LAUNCH_INCIDENT_SOURCES.filter((source) => source.key !== previousSource)
      : LAUNCH_INCIDENT_SOURCES;
  return options[Math.floor(Math.random() * options.length)];
}

function formatSelectedWorldTruths(
  truthDefinitions: Record<string, TruthDefinition>,
  selections?: Record<string, Truth>
): string[] {
  if (!selections) return [];
  return Object.entries(selections)
    .map(([key, selection]) => {
      const definition = truthDefinitions[key];
      const name = definition?.name ?? key;
      if (selection.selectedTruthOptionIndex === CUSTOM_TRUTH_INDEX) {
        const description = selection.customTruth?.description;
        return description ? `${name}: ${description}` : undefined;
      }
      const optionIndex = selection.selectedTruthOptionIndex ?? 0;
      const description = definition?.options?.[optionIndex]?.description;
      return description ? `${name}: ${description}` : undefined;
    })
    .filter((truth): truth is string => !!truth);
}

export function SessionPreflightDialog(props: SessionPreflightDialogProps) {
  const { open, campaignId, onClose, forceLaunchSetup = false } = props;
  const navigate = useNavigate();
  const { gameSystem } = useGameSystem();
  const showNewLocations = useNewMaps();
  const { rollOracleTable } = useRoller();

  const [step, setStep] = useState(0);
  const [incitingIncident, setIncitingIncident] = useState("");
  const [sceneMode, setSceneMode] =
    useState<LaunchSetupState["sceneMode"]>("in_medias_res");
  const [openingScene, setOpeningScene] = useState("");
  const [vowText, setVowText] = useState("");
  const [vowRank, setVowRank] = useState<Difficulty>(Difficulty.Dangerous);
  const [selectedNpcId, setSelectedNpcId] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [swearToConnection, setSwearToConnection] = useState(true);
  const [extraAdds, setExtraAdds] = useState(0);
  const [startingObstacle, setStartingObstacle] = useState("");
  const [rollResult, setRollResult] = useState<
    | {
        action: number;
        challengeDice: [number, number];
        score: number;
        outcome: ROLL_RESULT;
        modifier: number;
        adds: number;
        matchedNegativeMomentum: boolean;
      }
    | undefined
  >();
  const [isStarting, setIsStarting] = useState(false);
  const [loadedGuideCampaignId, setLoadedGuideCampaignId] = useState<string>();
  const [isGeneratingIncident, setIsGeneratingIncident] = useState(false);
  const [incidentGenerationError, setIncidentGenerationError] = useState("");
  const [lastIncidentSource, setLastIncidentSource] =
    useState<LaunchIncidentSource>();
  const [isGeneratingOpeningScene, setIsGeneratingOpeningScene] = useState(false);
  const [openingSceneGenerationError, setOpeningSceneGenerationError] = useState("");
  const [isGeneratingVow, setIsGeneratingVow] = useState(false);
  const [vowGenerationError, setVowGenerationError] = useState("");

  const hasCharacter = useStore(
    (store) =>
      Object.keys(store.campaigns.currentCampaign.characters.characterMap).length > 0
  );
  const hasWorld = useStore(
    (store) => !!store.campaigns.currentCampaign.currentCampaign?.worldId
  );
  const worldId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.worldId
  );
  const hasSectors = useStore(
    (store) =>
      Object.keys(store.worlds.currentWorld.currentWorldSectors.sectors).length > 0
  );
  const hasLocations = useStore(
    (store) =>
      Object.keys(store.worlds.currentWorld.currentWorldLocations.locationMap).length > 0
  );
  const characters = useStore(
    (store) => store.campaigns.currentCampaign.characters.characterMap
  );
  const npcs = useStore(
    (store) => store.worlds.currentWorld.currentWorldNPCs.npcMap
  );
  const currentWorld = useStore((store) => store.worlds.currentWorld.currentWorld);
  const truthDefinitions = useStore(
    (store) => store.rules.worldTruths as Record<string, TruthDefinition>
  );
  const sectors = useStore(
    (store) => store.worlds.currentWorld.currentWorldSectors.sectors
  );
  const locations = useStore(
    (store) => store.worlds.currentWorld.currentWorldLocations.locationMap
  );
  const guideState = useStore((store) => store.aiGuide.state);
  const loadGuideState = useStore((store) => store.aiGuide.loadGuideState);
  const saveGuideState = useStore((store) => store.aiGuide.saveGuideState);
  const startSession = useStore((store) => store.sessionLog.startSession);
  const logMoveEventForCharacter = useStore(
    (store) => store.sessionLog.logMoveEventForCharacter
  );

  const { data: starship } = useCampaignStarshipQuery(campaignId);
  const createCampaignTrack = useCreateCampaignTrackMutation(campaignId);
  const updateSelectedCharacter = useUpdateCharacterMutation(selectedCharacterId);
  const updateNPC = useUpdateNPCMutation(worldId);
  const hasShip = !!starship;

  const isStarforged = gameSystem === GAME_SYSTEMS.STARFORGED;
  const locationPassed = isStarforged
    ? showNewLocations ? hasLocations : hasSectors
    : hasLocations;
  const connectionNpcIds = useMemo(() => Object.keys(npcs), [npcs]);
  const hasConnection = connectionNpcIds.length > 0;

  const selectedCharacter = selectedCharacterId
    ? characters[selectedCharacterId]
    : undefined;
  const selectedNpc = selectedNpcId ? npcs[selectedNpcId] : undefined;
  const heart = selectedCharacter?.stats?.heart ?? 0;
  const connectionAdd = swearToConnection && selectedNpcId ? 1 : 0;
  const adds = connectionAdd + extraAdds;

  const checks: Check[] = [
    {
      label: "Character",
      passed: hasCharacter,
      hint: "Add a character on the Characters tab.",
    },
    {
      label: "Starship",
      passed: hasShip,
      hint: "Add a starship on the Characters tab.",
    },
    {
      label: "World",
      passed: hasWorld,
      hint: "Link a world on the World tab.",
    },
    {
      label: isStarforged && !showNewLocations ? "Sector" : "Location",
      passed: locationPassed,
      hint: isStarforged && !showNewLocations
        ? "Add a sector on the Sectors tab."
        : "Add a location on the Locations tab.",
    },
    {
      label: "Connection",
      passed: hasConnection,
      hint: "Create a starting connection NPC in the linked world.",
    },
  ];

  const allPassed = checks.every((c) => c.passed);
  const isGuideStateReady = loadedGuideCampaignId === campaignId;
  const launchAlreadyComplete =
    !forceLaunchSetup && isGuideStateReady && !!guideState?.launchSetup?.completedAt;
  const canContinue =
    (step === 0 && allPassed) ||
    (step === 1 && incitingIncident.trim().length > 0 && !isGeneratingIncident) ||
    (step === 2 &&
      openingScene.trim().length > 0 &&
      !isGeneratingOpeningScene) ||
    (step === 3 &&
      vowText.trim().length > 0 &&
      selectedNpcId &&
      selectedCharacterId &&
      !isGeneratingVow) ||
    (step === 4 &&
      !!rollResult &&
      (rollResult.outcome !== ROLL_RESULT.MISS ||
        startingObstacle.trim().length > 0));

  useEffect(() => {
    if (open && campaignId && loadedGuideCampaignId !== campaignId) {
      loadGuideState(campaignId)
        .catch(console.error)
        .finally(() => setLoadedGuideCampaignId(campaignId));
    }
  }, [campaignId, loadGuideState, loadedGuideCampaignId, open]);

  useEffect(() => {
    if (!open || !forceLaunchSetup) return;
    setStep(0);
    setIncitingIncident("");
    setSceneMode("in_medias_res");
    setOpeningScene("");
    setVowText("");
    setVowRank(Difficulty.Dangerous);
    setSelectedNpcId("");
    setSelectedCharacterId("");
    setSwearToConnection(true);
    setExtraAdds(0);
    setRollResult(undefined);
    setStartingObstacle("");
    setIncidentGenerationError("");
    setOpeningSceneGenerationError("");
    setVowGenerationError("");
    setLastIncidentSource(undefined);
  }, [forceLaunchSetup, open]);

  useEffect(() => {
    if (!selectedNpcId && connectionNpcIds.length > 0) {
      setSelectedNpcId(connectionNpcIds[0]);
    }
  }, [connectionNpcIds, selectedNpcId]);

  useEffect(() => {
    const characterIds = Object.keys(characters);
    if (!selectedCharacterId && characterIds.length > 0) {
      setSelectedCharacterId(characterIds[0]);
    }
  }, [characters, selectedCharacterId]);

  const handleClose = () => {
    if (
      !isStarting &&
      !isGeneratingIncident &&
      !isGeneratingOpeningScene &&
      !isGeneratingVow
    ) {
      onClose();
    }
  };

  const appendOracle = (label: string, oracleId: string) => {
    const result = rollOracleTable(oracleId, false)?.result;
    if (!result) return;
    setIncitingIncident((current) =>
      [current.trim(), `${label}: ${result}`].filter(Boolean).join("\n")
    );
  };

  const appendObstacleOracle = (label: string, oracleId: string) => {
    const result = rollOracleTable(oracleId, false)?.result;
    if (!result) return;
    setStartingObstacle((current) =>
      [current.trim(), `${label}: ${result}`].filter(Boolean).join("\n")
    );
  };

  const rollStarter = () => {
    const index = Math.floor(Math.random() * STARTER_INCIDENTS.length);
    setIncitingIncident((current) =>
      [current.trim(), `Starter: ${STARTER_INCIDENTS[index]}`]
        .filter(Boolean)
        .join("\n")
    );
  };

  const buildLaunchOracleResults = (sourceKey: LaunchIncidentSourceKey) => {
    if (sourceKey === "actionTheme") {
      return [
        `Action: ${rollOracleTable("starforged/oracles/core/action", false)?.result ?? "Unknown"}`,
        `Theme: ${rollOracleTable("starforged/oracles/core/theme", false)?.result ?? "Unknown"}`,
      ];
    }
    if (sourceKey === "characterGoal") {
      return [
        `Character Goal: ${rollOracleTable("starforged/oracles/characters/goal", false)?.result ?? "Unknown"}`,
      ];
    }
    if (sourceKey === "starterTable") {
      const index = Math.floor(Math.random() * STARTER_INCIDENTS.length);
      return [`Starter: ${STARTER_INCIDENTS[index]}`];
    }
    return [];
  };

  const buildLaunchContext = (): LaunchCampaignContext => {
    const store = useStore.getState();
    const baseContext = buildBaseCampaignContext(gameSystem, store);
    return {
      ...baseContext,
      guideState: buildGuideStateContext(store),
      launchSetup: {
        worldTruths: formatSelectedWorldTruths(
          truthDefinitions,
          currentWorld?.newTruths
        ),
        characters: Object.values(characters).map((character) => ({
          name: character.name,
          callsign: character.callsign,
          role: character.role,
          pronouns: character.pronouns,
          characteristics: character.characteristics,
          backstory: character.backstory,
        })),
        starship,
        sectors: Object.values(sectors).map((sector) => ({
          name: sector.name,
          region: sector.region,
          trouble: sector.trouble,
        })),
        locations: Object.values(locations).map((location) => ({
          name: location.name,
          type: location.type,
          fields: location.fields,
        })),
        npcs: Object.values(npcs).map((npc) => ({
          name: npc.name,
          role: npc.gmProperties?.role,
          disposition: npc.gmProperties?.disposition,
          goal: npc.gmProperties?.goal,
          rank: npc.rank,
          callsign: npc.callsign,
        })),
      },
    };
  };

  const generateIncidentWithAI = async () => {
    const source = pickLaunchIncidentSource(lastIncidentSource?.key);
    const previousIncident = incitingIncident.trim();
    const oracleResults = buildLaunchOracleResults(source.key);
    setLastIncidentSource(source);
    setIncidentGenerationError("");
    setIncitingIncident("");
    setIsGeneratingIncident(true);

    try {
      let fullText = "";
      const stream = generateLaunchIncidentStream({
        campaignId,
        worldId,
        source,
        oracleResults,
        previousIncidents: previousIncident ? [previousIncident] : [],
        context: buildLaunchContext(),
      });

      for await (const chunk of stream) {
        fullText += chunk;
        setIncitingIncident(fullText);
      }
    } catch (err) {
      console.error("Failed to generate inciting incident:", err);
      const message = err instanceof Error ? err.message : "Generation failed";
      setIncidentGenerationError(
        `Could not generate an incident: ${message}. Try again or write one manually.`
      );
      setIncitingIncident(previousIncident);
    } finally {
      setIsGeneratingIncident(false);
    }
  };

  const generateOpeningSceneWithAI = async () => {
    const previousOpeningScene = openingScene.trim();
    setOpeningSceneGenerationError("");
    setOpeningScene("");
    setIsGeneratingOpeningScene(true);

    try {
      let fullText = "";
      const stream = generateLaunchOpeningSceneStream({
        campaignId,
        worldId,
        sceneMode,
        incitingIncident: incitingIncident.trim(),
        previousOpeningScenes: previousOpeningScene ? [previousOpeningScene] : [],
        context: buildLaunchContext(),
      });

      for await (const chunk of stream) {
        fullText += chunk;
        setOpeningScene(fullText);
      }
    } catch (err) {
      console.error("Failed to generate opening scene:", err);
      const message = err instanceof Error ? err.message : "Generation failed";
      setOpeningSceneGenerationError(
        `Could not generate an opening scene: ${message}. Try again or write one manually.`
      );
      setOpeningScene(previousOpeningScene);
    } finally {
      setIsGeneratingOpeningScene(false);
    }
  };

  const generateVowWithAI = async () => {
    const previousVow = vowText.trim();
    setVowGenerationError("");
    setVowText("");
    setIsGeneratingVow(true);

    try {
      let fullText = "";
      const stream = generateLaunchVowStream({
        campaignId,
        worldId,
        incitingIncident: incitingIncident.trim(),
        openingScene: openingScene.trim(),
        vowRank,
        connectionName: selectedNpc?.name,
        swearingCharacterName: selectedCharacter?.name,
        previousVows: previousVow ? [previousVow] : [],
        context: buildLaunchContext(),
      });

      for await (const chunk of stream) {
        fullText += chunk;
        setVowText(fullText);
      }
    } catch (err) {
      console.error("Failed to generate launch vow:", err);
      const message = err instanceof Error ? err.message : "Generation failed";
      setVowGenerationError(
        `Could not generate a vow: ${message}. Try again or write one manually.`
      );
      setVowText(previousVow);
    } finally {
      setIsGeneratingVow(false);
    }
  };

  const rollSwearMove = () => {
    if (!selectedCharacter) return;
    const action = getRoll(6);
    const challenge1 = getRoll(10);
    const challenge2 = getRoll(10);
    const matchedNegativeMomentum =
      selectedCharacter.momentum < 0 &&
      Math.abs(selectedCharacter.momentum) === action;
    const effectiveAction = matchedNegativeMomentum ? 0 : action;
    const score = Math.min(10, effectiveAction + heart + adds);
    const outcome =
      score > challenge1 && score > challenge2
        ? ROLL_RESULT.HIT
        : score <= challenge1 && score <= challenge2
        ? ROLL_RESULT.MISS
        : ROLL_RESULT.WEAK_HIT;
    setRollResult({
      action,
      challengeDice: [challenge1, challenge2],
      score,
      outcome,
      modifier: heart,
      adds,
      matchedNegativeMomentum,
    });
    if (outcome !== ROLL_RESULT.MISS) {
      setStartingObstacle("");
    }
  };

  const handleStart = async () => {
    if (!selectedCharacter || !selectedNpc || !rollResult) return;
    const obstacleText = startingObstacle.trim();
    if (rollResult.outcome === ROLL_RESULT.MISS && !obstacleText) return;
    const swearMoveObstacle =
      rollResult.outcome === ROLL_RESULT.MISS
        ? {
            text: obstacleText,
            resolved: false,
            source: "swear_miss" as const,
          }
        : undefined;
    setIsStarting(true);
    try {
      if (forceLaunchSetup) {
        await api.del(`/api/campaigns/${campaignId}/scene-events`);
      }
      const trackRow = await createCampaignTrack.mutateAsync({
        type: TrackTypes.Vow,
        dataJson: {
          label: vowText.trim(),
          description: incitingIncident.trim(),
          difficulty: vowRank,
          value: 0,
          status: TrackStatus.Active,
          type: TrackTypes.Vow,
        },
      });
      const vowTrackId = trackRow.id as string;

      const sessionId = await startSession({ campaignId, title: "Begin Your Adventure" });

      const momentumApplied =
        rollResult.outcome === ROLL_RESULT.HIT
          ? 2
          : rollResult.outcome === ROLL_RESULT.WEAK_HIT
          ? 1
          : 0;
      if (momentumApplied > 0) {
        const activeDebilities = Object.values(
          selectedCharacter.debilities ?? {}
        ).filter(Boolean).length;
        const maxMomentum = momentumTrack.max - activeDebilities;
        await updateSelectedCharacter.mutateAsync({
          momentum: Math.min(maxMomentum, selectedCharacter.momentum + momentumApplied),
        });
      }

      const {
        name: _npcName,
        imageFilenames: _npcImageFilenames,
        gmProperties: _npcGmProperties,
        notes: _npcNotes,
        imageUrl: _npcImageUrl,
        updatedDate: _npcUpdatedDate,
        createdDate: _npcCreatedDate,
        ...selectedNpcData
      } = selectedNpc;
      await updateNPC.mutateAsync({
        npcId: selectedNpcId,
        patch: {
          dataJson: {
            ...selectedNpcData,
            characterConnections: Object.keys(characters).reduce(
              (connections, characterId) => ({
                ...connections,
                [characterId]: true,
              }),
              selectedNpc.characterConnections ?? {}
            ),
          },
        },
      });

      await logMoveEventForCharacter(selectedCharacterId, selectedCharacter.name, {
        moveId: SWEAR_IRON_VOW_MOVE_ID,
        moveName: "Swear an Iron Vow",
        stat: "Heart",
        statValue: heart,
        playerContext: [
          `Inciting incident: ${incitingIncident.trim()}`,
          `Opening scene: ${openingScene.trim()}`,
          `Vow: ${vowText.trim()}`,
          `Connection: ${selectedNpc.name}`,
          swearToConnection ? "Sworn to a connection: +1" : "",
          nextStepPrompt(rollResult.outcome),
          swearMoveObstacle
            ? `Starting obstacle: ${swearMoveObstacle.text}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
        action: rollResult.action,
        challengeDice: rollResult.challengeDice,
        score: rollResult.score,
        outcome: rollResult.outcome,
      });

      const currentGuideState = guideState ?? defaultAIGuideState;
      const launchSetup: LaunchSetupState = {
        completedAt: new Date().toISOString(),
        firstSessionId: sessionId,
        incitingIncident: incitingIncident.trim(),
        sceneMode,
        openingScene: openingScene.trim(),
        connectionNpcId: selectedNpcId,
        vowTrackId,
        swearingCharacterId: selectedCharacterId,
        swearMoveResult: {
          action: rollResult.action,
          challengeDice: rollResult.challengeDice,
          score: rollResult.score,
          outcome: resultKey(rollResult.outcome),
          momentumApplied,
        },
        nextStepPrompt: nextStepPrompt(rollResult.outcome),
        swearMoveObstacle,
      };
      const createdAt = new Date().toISOString();
      const outcomeLine = `${resultLabel(rollResult.outcome)}: ${nextStepPrompt(
        rollResult.outcome
      )}`;
      await saveGuideState(campaignId, {
        ...currentGuideState,
        launchSetup,
        currentScene: {
          title: sceneMode === "prologue" ? "Prologue" : "In Medias Res",
          description: [
            "## Inciting Incident",
            incitingIncident.trim(),
            "",
            "## Opening Scene",
            openingScene.trim(),
            "",
            "## Starting Vow",
            `${vowText.trim()} (${vowRank})`,
            "",
            "## Swear an Iron Vow",
            outcomeLine,
            ...(swearMoveObstacle
              ? ["", "## Starting Obstacle", swearMoveObstacle.text]
              : []),
          ].join("\n"),
          unresolvedQuestions:
            swearMoveObstacle
              ? [swearMoveObstacle.text]
              : rollResult.outcome === ROLL_RESULT.HIT
              ? []
              : [nextStepPrompt(rollResult.outcome)],
        },
        canonLedger: [
          ...(currentGuideState.canonLedger ?? []),
          {
            id: `${Date.now()}-incident`,
            text: `Inciting incident: ${incitingIncident.trim()}`,
            source: "launch",
            status: "confirmed",
            createdAt,
          },
          {
            id: `${Date.now()}-vow`,
            text: `Opening vow: ${vowText.trim()}`,
            source: "launch",
            status: "confirmed",
            createdAt,
          },
          ...(swearMoveObstacle
            ? [
                {
                  id: `${Date.now()}-vow-obstacle`,
                  text: `Starting vow obstacle: ${swearMoveObstacle.text}`,
                  source: "launch",
                  status: "confirmed" as const,
                  createdAt,
                },
              ]
            : []),
        ],
        sceneChallengeState: swearMoveObstacle
          ? {
              objective: `Overcome the starting obstacle before the vow can truly begin: ${swearMoveObstacle.text}`,
              progress: 0,
              complicationsIntroduced: [],
            }
          : currentGuideState.sceneChallengeState,
      });

      onClose();
      navigate(constructCampaignSheetPath(campaignId, CAMPAIGN_ROUTES.PLAY));
    } catch (err) {
      console.error("Failed to start launch session:", err);
      setIsStarting(false);
    }
  };

  const startExisting = async () => {
    setIsStarting(true);
    try {
      await startSession({ campaignId });
      onClose();
      navigate(constructCampaignSheetPath(campaignId, CAMPAIGN_ROUTES.PLAY));
    } catch (err) {
      console.error("Failed to start session:", err);
      setIsStarting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {launchAlreadyComplete ? "Ready to Play?" : "Begin Your Adventure"}
      </DialogTitle>
      <DialogContent>
        {!isGuideStateReady ? (
          <Typography variant="body2" color="text.secondary">
            Loading campaign launch state...
          </Typography>
        ) : launchAlreadyComplete ? (
          <Typography variant="body2" color="text.secondary">
            The campaign launch setup is complete. Start a new session when
            everyone is ready.
          </Typography>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <Stepper activeStep={step} alternativeLabel>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {step === 0 && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Confirm the campaign has the pieces needed for the launch
                  exercise on pages 128-135.
                </Typography>
                <List dense disablePadding>
                  {checks.map((check) => (
                    <ListItem key={check.label} disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {check.passed ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <ErrorIcon color="error" fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={check.label}
                        secondary={!check.passed ? check.hint : undefined}
                        primaryTypographyProps={{ variant: "body2" }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {step === 1 && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Envision the problem or urgent goal that propels the campaign
                  into action. It should be personal, time-sensitive, and
                  manageable in a session or two.
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CasinoIcon />}
                    onClick={generateIncidentWithAI}
                    disabled={isGeneratingIncident || !allPassed}
                  >
                    {incitingIncident.trim() ? "Try Another" : "Generate with AI"}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CasinoIcon />}
                    onClick={() =>
                      appendOracle("Action", "starforged/oracles/core/action")
                    }
                    disabled={isGeneratingIncident}
                  >
                    Action
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CasinoIcon />}
                    onClick={() =>
                      appendOracle("Theme", "starforged/oracles/core/theme")
                    }
                    disabled={isGeneratingIncident}
                  >
                    Theme
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CasinoIcon />}
                    onClick={() =>
                      appendOracle("Character Goal", "starforged/oracles/characters/goal")
                    }
                    disabled={isGeneratingIncident}
                  >
                    Character Goal
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CasinoIcon />}
                    onClick={rollStarter}
                    disabled={isGeneratingIncident}
                  >
                    Starter
                  </Button>
                </Stack>
                {lastIncidentSource && (
                  <Typography variant="caption" color="text.secondary">
                    {isGeneratingIncident ? "Generating" : "Last generated"} from{" "}
                    {lastIncidentSource.label}.
                  </Typography>
                )}
                {incidentGenerationError && (
                  <Alert severity="error">{incidentGenerationError}</Alert>
                )}
                <TextField
                  label="Inciting Incident"
                  value={incitingIncident}
                  onChange={(e) => setIncitingIncident(e.target.value)}
                  multiline
                  minRows={5}
                  fullWidth
                  disabled={isGeneratingIncident}
                />
              </>
            )}

            {step === 2 && (
              <>
                <TextField
                  label="Opening Mode"
                  select
                  value={sceneMode}
                  onChange={(e) =>
                    setSceneMode(e.target.value as LaunchSetupState["sceneMode"])
                  }
                  fullWidth
                  disabled={isGeneratingOpeningScene}
                >
                  <MenuItem value="in_medias_res">In medias res</MenuItem>
                  <MenuItem value="prologue">Prologue</MenuItem>
                </TextField>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CasinoIcon />}
                    onClick={generateOpeningSceneWithAI}
                    disabled={
                      isGeneratingOpeningScene ||
                      isGeneratingIncident ||
                      !incitingIncident.trim()
                    }
                  >
                    {openingScene.trim() ? "Try Another" : "Generate with AI"}
                  </Button>
                </Stack>
                {openingSceneGenerationError && (
                  <Alert severity="error">{openingSceneGenerationError}</Alert>
                )}
                <TextField
                  label="Opening Scene"
                  value={openingScene}
                  onChange={(e) => setOpeningScene(e.target.value)}
                  multiline
                  minRows={5}
                  fullWidth
                  disabled={isGeneratingOpeningScene}
                  helperText="Describe where play begins and what the characters immediately face."
                />
              </>
            )}

            {step === 3 && (
              <>
                <TextField
                  label="Starting Connection"
                  select
                  value={selectedNpcId}
                  onChange={(e) => setSelectedNpcId(e.target.value)}
                  fullWidth
                  disabled={isGeneratingVow}
                >
                  {connectionNpcIds.map((npcId) => (
                    <MenuItem key={npcId} value={npcId}>
                      {npcs[npcId]?.name ?? "Unnamed NPC"}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Swearing Character"
                  select
                  value={selectedCharacterId}
                  onChange={(e) => setSelectedCharacterId(e.target.value)}
                  fullWidth
                  disabled={isGeneratingVow}
                >
                  {Object.keys(characters).map((characterId) => (
                    <MenuItem key={characterId} value={characterId}>
                      {characters[characterId]?.name ?? "Unnamed Character"}
                    </MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CasinoIcon />}
                    onClick={generateVowWithAI}
                    disabled={
                      isGeneratingVow ||
                      !incitingIncident.trim() ||
                      !openingScene.trim() ||
                      !selectedNpcId ||
                      !selectedCharacterId
                    }
                  >
                    {vowText.trim() ? "Try Another" : "Generate with AI"}
                  </Button>
                </Stack>
                {vowGenerationError && <Alert severity="error">{vowGenerationError}</Alert>}
                <TextField
                  label="Vow"
                  value={vowText}
                  onChange={(e) => setVowText(e.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                  disabled={isGeneratingVow}
                />
                <TextField
                  label="Rank"
                  select
                  value={vowRank}
                  onChange={(e) => setVowRank(e.target.value as Difficulty)}
                  fullWidth
                  disabled={isGeneratingVow}
                >
                  <MenuItem value={Difficulty.Troublesome}>Troublesome</MenuItem>
                  <MenuItem value={Difficulty.Dangerous}>Dangerous</MenuItem>
                </TextField>
              </>
            )}

            {step === 4 && (
              <>
                <Alert severity="info">
                  Roll +heart. Add +1 if this vow is sworn to the selected
                  connection. Apply +2 momentum on a strong hit or +1 momentum
                  on a weak hit.
                </Alert>
                <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={swearToConnection}
                        onChange={(e) => setSwearToConnection(e.target.checked)}
                      />
                    }
                    label={`Swear to ${selectedNpc?.name ?? "connection"} (+1)`}
                  />
                  <TextField
                    label="Other Adds"
                    type="number"
                    value={extraAdds}
                    onChange={(e) => setExtraAdds(Number(e.target.value) || 0)}
                  />
                </Box>
                <Button variant="outlined" startIcon={<CasinoIcon />} onClick={rollSwearMove}>
                  Roll Swear an Iron Vow
                </Button>
                {rollResult && (
                  <Alert severity={rollResult.outcome === ROLL_RESULT.MISS ? "warning" : "success"}>
                    {resultLabel(rollResult.outcome)}: action {rollResult.action}
                    {rollResult.matchedNegativeMomentum ? " cancelled by negative momentum" : ""} + heart {rollResult.modifier}
                    {rollResult.adds ? ` + adds ${rollResult.adds}` : ""} = {rollResult.score};
                    challenge dice {rollResult.challengeDice[0]}, {rollResult.challengeDice[1]}.{" "}
                    {nextStepPrompt(rollResult.outcome)}
                  </Alert>
                )}
                {rollResult?.outcome === ROLL_RESULT.MISS && (
                  <Stack spacing={1.5}>
                    <Alert severity="warning">
                      Define the obstacle before starting the session. The vow
                      cannot truly begin until this is overcome, and resolving it
                      should not mark progress on the vow.
                    </Alert>
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CasinoIcon />}
                        onClick={() =>
                          appendObstacleOracle(
                            "Action",
                            "starforged/oracles/core/action"
                          )
                        }
                      >
                        Action
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CasinoIcon />}
                        onClick={() =>
                          appendObstacleOracle(
                            "Theme",
                            "starforged/oracles/core/theme"
                          )
                        }
                      >
                        Theme
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CasinoIcon />}
                        onClick={() =>
                          appendObstacleOracle(
                            "Character Goal",
                            "starforged/oracles/characters/goal"
                          )
                        }
                      >
                        Character Goal
                      </Button>
                    </Stack>
                    <TextField
                      label="Starting Obstacle"
                      value={startingObstacle}
                      onChange={(e) => setStartingObstacle(e.target.value)}
                      multiline
                      minRows={3}
                      fullWidth
                      required
                      helperText="Describe the danger, demand, or revelation that must be dealt with before the quest can move forward."
                    />
                  </Stack>
                )}
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          color="inherit"
          disabled={
            isStarting ||
            isGeneratingIncident ||
            isGeneratingOpeningScene ||
            isGeneratingVow
          }
        >
          Cancel
        </Button>
        {launchAlreadyComplete ? (
          <Button onClick={startExisting} variant="contained" disabled={isStarting}>
            {isStarting ? "Starting..." : "Start Session"}
          </Button>
        ) : isGuideStateReady ? (
          <>
            <Button
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={
                step === 0 ||
                isStarting ||
                isGeneratingIncident ||
                isGeneratingOpeningScene ||
                isGeneratingVow
              }
              color="inherit"
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((current) => current + 1)}
                variant="contained"
                disabled={!canContinue || isStarting}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                variant="contained"
                disabled={!canContinue || isStarting}
              >
                {isStarting ? "Starting..." : "Start Session"}
              </Button>
            )}
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
