import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useCallback, useState } from "react";
import { useRoller } from "stores/appState/useRoller";
import { useGameSystemValue } from "hooks/useGameSystemValue";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { TextFieldWithOracle } from "components/shared/TextFieldWithOracle/TextFieldWithOracle";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";
import { generateCharacterSummary } from "api-calls/ai/generateCharacterSummary";
import { WorldContext } from "api-calls/ai/_ai.type";

const nameOraclesIronsworn = [
  "classic/oracles/name/ironlander/a",
  "classic/oracles/name/ironlander/b",
];
const nameOraclesStarforged = [
  "starforged/oracles/characters/name/given",
  "starforged/oracles/characters/name/family_name",
];

export interface NameCharacterStepProps {
  onComplete: (name: string, callsign: string, characteristics: string) => void;
  initialName?: string;
  pathNames: string[];
  backstory: string;
  backgroundVow: string;
  look: string;
  act: string;
  wear: string;
  pronouns: string;
  worldContext?: WorldContext;
}

export function NameCharacterStep({
  onComplete,
  initialName,
  pathNames,
  backstory,
  backgroundVow,
  look,
  act,
  wear,
  pronouns,
  worldContext,
}: NameCharacterStepProps) {
  const showAi = useAiGuide();
  const { rollOracleTable } = useRoller();

  const [name, setName] = useState(initialName ?? "");
  const [callsign, setCallsign] = useState("");
  const [characteristics, setCharacteristics] = useState("");
  const [characteristicsLoading, setCharacteristicsLoading] = useState(false);
  const [characteristicsError, setCharacteristicsError] = useState<string | null>(null);

  const nameOracles = useGameSystemValue({
    [GAME_SYSTEMS.IRONSWORN]: nameOraclesIronsworn,
    [GAME_SYSTEMS.STARFORGED]: nameOraclesStarforged,
  });
  const joinOracles = useGameSystemValue({
    [GAME_SYSTEMS.IRONSWORN]: false,
    [GAME_SYSTEMS.STARFORGED]: true,
  });

  const handleOracleRoll = useCallback(() => {
    if (joinOracles) {
      return nameOracles
        .map((id) => rollOracleTable(id, false)?.result ?? "")
        .join(" ");
    }
    const idx = Math.floor(Math.random() * nameOracles.length);
    return rollOracleTable(nameOracles[idx], false)?.result ?? "";
  }, [rollOracleTable, nameOracles, joinOracles]);

  const handleGenerateCharacteristics = async () => {
    setCharacteristicsLoading(true);
    setCharacteristicsError(null);
    try {
      const result = await generateCharacterSummary({
        name: name.trim() || "Unknown",
        paths: pathNames,
        backstory,
        backgroundVow,
        look,
        act,
        wear,
        pronouns,
        worldContext,
      });
      if (result?.summary) {
        setCharacteristics(result.summary);
      }
    } catch {
      setCharacteristicsError("Failed to generate characteristics. Please try again.");
    } finally {
      setCharacteristicsLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Name Your Character
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        What do those who know you call you? Enter your name or roll the oracle
        for a suggestion.
      </Typography>

      <TextFieldWithOracle
        label="Character Name"
        value={name}
        onChange={setName}
        getOracleValue={handleOracleRoll}
        sx={{ maxWidth: 350, mb: 3 }}
      />

      <TextField
        label="Callsign"
        size="small"
        value={callsign}
        onChange={(e) => setCallsign(e.target.value)}
        placeholder="e.g. Ghost, Ember"
        sx={{ maxWidth: 220, mb: 3, display: "block" }}
      />

      <Typography variant="body2" color="text.secondary" mb={1}>
        Characteristics
      </Typography>
      <TextField
        label="Characteristics"
        value={characteristics}
        onChange={(e) => setCharacteristics(e.target.value)}
        placeholder="e.g. Ace pilot with a grudge, Cybernetic eye, wears a bright red flight suit"
        fullWidth
        multiline
        minRows={2}
        sx={{ maxWidth: 540, mb: 2 }}
      />

      {showAi && (
        <Box mb={2}>
          <Button
            variant="outlined"
            startIcon={
              characteristicsLoading ? (
                <CircularProgress size={16} />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            onClick={handleGenerateCharacteristics}
            disabled={characteristicsLoading}
          >
            {characteristicsLoading ? "Generating…" : "Generate Characteristics"}
          </Button>
        </Box>
      )}

      {characteristicsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {characteristicsError}
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={() => onComplete(name.trim(), callsign.trim(), characteristics.trim())}
        disabled={!name.trim()}
      >
        Continue
      </Button>
    </Box>
  );
}
