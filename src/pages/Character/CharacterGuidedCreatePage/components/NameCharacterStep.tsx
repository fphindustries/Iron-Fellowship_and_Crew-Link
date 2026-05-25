import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
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
  onComplete: (name: string, summary: string) => void;
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
  const [aiSummary, setAiSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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
    setSummaryLoading(true);
    setSummaryError(null);
    setAiSummary("");
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
        setAiSummary((prev) => prev + chunk);
      }
    } catch {
      setSummaryError("Failed to generate summary. Please try again.");
    } finally {
      setSummaryLoading(false);
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

      {showAi && (
        <Box mb={2}>
          <Button
            variant="outlined"
            startIcon={
              summaryLoading ? (
                <CircularProgress size={16} />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
          >
            {summaryLoading ? "Generating…" : "Generate Summary"}
          </Button>
        </Box>
      )}

      {summaryError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {summaryError}
        </Alert>
      )}

      {(aiSummary || summaryLoading) && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 3, bgcolor: "background.paperInlay" }}
        >
          {aiSummary ? (
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Typography variant="body2" sx={{ fontStyle: "italic", flex: 1 }}>
                {aiSummary}
              </Typography>
              {summaryLoading && <CircularProgress size={14} sx={{ mt: 0.3, flexShrink: 0 }} />}
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
        onClick={() => onComplete(name.trim(), aiSummary)}
        disabled={!name.trim() || summaryLoading}
      >
        Continue
      </Button>
    </Box>
  );
}
