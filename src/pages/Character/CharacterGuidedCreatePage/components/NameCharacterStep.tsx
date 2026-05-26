import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
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
import { generateCharacterSummaryStream } from "api/ai/generateCharacterSummary";
import { WorldContext } from "types/AI.type";

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

  const handleGenerateSummary = async () => {
    setCharacteristicsLoading(true);
    setCharacteristicsError(null);
    setCharacteristics("");
    try {
      for await (const chunk of generateCharacterSummaryStream({
        name: name.trim() || "Unknown",
        paths: pathNames,
        backstory,
        backgroundVow,
        look,
        act,
        wear,
        pronouns,
        worldContext,
      })) {
        setCharacteristics((prev) => prev + chunk);
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
            onClick={handleGenerateSummary}
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

      {(characteristics || characteristicsLoading) && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 3, bgcolor: "background.paperInlay" }}
        >
          {characteristics ? (
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Typography variant="body2" sx={{ fontStyle: "italic", flex: 1 }}>
                {characteristics}
              </Typography>
              {characteristicsLoading && <CircularProgress size={14} sx={{ mt: 0.3, flexShrink: 0 }} />}
            </Stack>
          ) : (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Generating summary…
              </Typography>
            </Stack>
          )}
        </Paper>
      )}

      <Button
        variant="contained"
        onClick={() => onComplete(name.trim(), callsign.trim(), characteristics.trim())}
        disabled={!name.trim() || characteristicsLoading}
      >
        Continue
      </Button>
    </Box>
  );
}
