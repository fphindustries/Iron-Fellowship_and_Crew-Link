import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CasinoIcon from "@mui/icons-material/Casino";
import PsychologyIcon from "@mui/icons-material/Psychology";
import { useState } from "react";
import { useAiCopilot } from "hooks/featureFlags/useAiCopilot";
import { useStore } from "stores/store";
import { generateCharacterVow } from "api-calls/ai/generateCharacterVow";
import { Datasworn } from "@datasworn/core";

const ACTION_ORACLE_ID = "starforged/oracles/core/action";
const THEME_ORACLE_ID = "starforged/oracles/core/theme";
const GOAL_ORACLE_ID = "starforged/oracles/characters/goal";

type Method = "write" | "paths-backstory" | "action-theme" | "character-goal" | "custom";

export interface CreateBackgroundVowStepProps {
  onComplete: (vow: string) => void;
  pathNames: string[];
  backstory: string;
}

function rollOracleText(
  oracle: Datasworn.OracleRollable | undefined
): string | undefined {
  if (!oracle || !("rows" in oracle)) return undefined;
  const roll = Math.ceil(Math.random() * 100);
  const row = oracle.rows.find(
    (r) => r.min !== null && r.max !== null && r.min <= roll && r.max >= roll
  );
  return row?.text;
}

export function CreateBackgroundVowStep({
  onComplete,
  pathNames,
  backstory,
}: CreateBackgroundVowStepProps) {
  const showAi = useAiCopilot();
  const oracleRollableMap = useStore(
    (s) => s.rules.oracleMaps.oracleRollableMap
  );

  const [method, setMethod] = useState<Method>("write");
  const [vowText, setVowText] = useState("");
  const [customPromptText, setCustomPromptText] = useState("");
  const [oracleDisplay, setOracleDisplay] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleMethodChange = (_: unknown, newMethod: Method | null) => {
    if (!newMethod) return;
    setMethod(newMethod);
    setVowText("");
    setOracleDisplay(null);
    setAiError(null);
  };

  const callAi = async (prompt: string) => {
    setAiLoading(true);
    setAiError(null);
    setVowText("");
    try {
      const result = await generateCharacterVow({
        paths: pathNames,
        backstory,
        prompt,
      });
      setVowText(result?.vow ?? "");
    } catch {
      setAiError("Failed to generate vow. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleRollActionTheme = () => {
    const action = rollOracleText(oracleRollableMap[ACTION_ORACLE_ID]);
    const theme = rollOracleText(oracleRollableMap[THEME_ORACLE_ID]);
    if (action && theme) {
      const display = `${action} + ${theme}`;
      setOracleDisplay(display);
      setVowText("");
      setAiError(null);
    }
  };

  const handleRollCharacterGoal = () => {
    const goal = rollOracleText(oracleRollableMap[GOAL_ORACLE_ID]);
    if (goal) {
      setOracleDisplay(goal);
      setVowText("");
      setAiError(null);
    }
  };

  const canConfirm = vowText.trim().length > 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Write Your Background Vow
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Your background vow represents a primary motivation or sacred
        commitment — sworn months or years ago. Write it in your
        character&apos;s own words: <em>&ldquo;I will...&rdquo;</em> or{" "}
        <em>&ldquo;I vow to...&rdquo;</em> This is an epic vow; fulfilling it
        may take years of play.
      </Typography>

      <ToggleButtonGroup
        value={method}
        exclusive
        onChange={handleMethodChange}
        sx={{ flexWrap: "wrap", gap: 1, mb: 3 }}
      >
        <ToggleButton value="write" sx={{ gap: 0.5 }}>
          <EditIcon fontSize="small" />
          Write My Own
        </ToggleButton>
        {showAi && (
          <ToggleButton value="paths-backstory" sx={{ gap: 0.5 }}>
            <AutoAwesomeIcon fontSize="small" />
            Use Paths &amp; Backstory
          </ToggleButton>
        )}
        {showAi && (
          <ToggleButton value="action-theme" sx={{ gap: 0.5 }}>
            <CasinoIcon fontSize="small" />
            Roll Action &amp; Theme
          </ToggleButton>
        )}
        {showAi && (
          <ToggleButton value="character-goal" sx={{ gap: 0.5 }}>
            <CasinoIcon fontSize="small" />
            Roll Character Goal
          </ToggleButton>
        )}
        {showAi && (
          <ToggleButton value="custom" sx={{ gap: 0.5 }}>
            <PsychologyIcon fontSize="small" />
            Custom Prompt
          </ToggleButton>
        )}
      </ToggleButtonGroup>

      {/* Write My Own */}
      {method === "write" && (
        <TextField
          multiline
          minRows={3}
          fullWidth
          placeholder='e.g. "I will destroy the Iron Talon raider clan."'
          value={vowText}
          onChange={(e) => setVowText(e.target.value)}
          sx={{ mb: 2 }}
        />
      )}

      {/* Use Paths & Backstory */}
      {method === "paths-backstory" && showAi && (
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            The AI will suggest a vow based on your chosen paths
            {pathNames.length > 0 && (
              <>
                {" "}
                (<strong>{pathNames.join(", ")}</strong>)
              </>
            )}{" "}
            and backstory.
          </Typography>
          <Button
            variant="outlined"
            startIcon={
              aiLoading ? (
                <CircularProgress size={16} />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            onClick={() => callAi("")}
            disabled={aiLoading}
          >
            {aiLoading ? "Generating…" : "Generate Vow"}
          </Button>
        </Box>
      )}

      {/* Roll Action & Theme */}
      {method === "action-theme" && showAi && (
        <Box mb={2}>
          <Button
            variant="outlined"
            startIcon={<CasinoIcon />}
            onClick={handleRollActionTheme}
            disabled={aiLoading}
            size="large"
          >
            Roll Action &amp; Theme
          </Button>
          {oracleDisplay && (
            <Alert severity="info" sx={{ mt: 2, mb: 1.5 }}>
              Rolled: <strong>{oracleDisplay}</strong>
            </Alert>
          )}
          {oracleDisplay && (
            <Button
              variant="outlined"
              startIcon={
                aiLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <AutoAwesomeIcon />
                )
              }
              onClick={() => callAi(oracleDisplay)}
              disabled={aiLoading}
            >
              {aiLoading ? "Generating…" : "Generate Vow"}
            </Button>
          )}
        </Box>
      )}

      {/* Roll Character Goal */}
      {method === "character-goal" && showAi && (
        <Box mb={2}>
          <Button
            variant="outlined"
            startIcon={<CasinoIcon />}
            onClick={handleRollCharacterGoal}
            disabled={aiLoading}
            size="large"
          >
            Roll Character Goal
          </Button>
          {oracleDisplay && (
            <Alert severity="info" sx={{ mt: 2, mb: 1.5 }}>
              Rolled: <strong>{oracleDisplay}</strong>
            </Alert>
          )}
          {oracleDisplay && (
            <Button
              variant="outlined"
              startIcon={
                aiLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <AutoAwesomeIcon />
                )
              }
              onClick={() => callAi(oracleDisplay)}
              disabled={aiLoading}
            >
              {aiLoading ? "Generating…" : "Generate Vow"}
            </Button>
          )}
        </Box>
      )}

      {/* Custom Prompt */}
      {method === "custom" && showAi && (
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Describe the commitment or goal your character has sworn, and the
            AI will write a vow.
          </Typography>
          <TextField
            multiline
            minRows={3}
            fullWidth
            placeholder="e.g. Avenge the colony that was destroyed while I was away..."
            value={customPromptText}
            onChange={(e) => setCustomPromptText(e.target.value)}
            disabled={aiLoading}
            sx={{ mb: 1.5 }}
          />
          <Button
            variant="outlined"
            startIcon={
              aiLoading ? (
                <CircularProgress size={16} />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            onClick={() => callAi(customPromptText)}
            disabled={aiLoading || !customPromptText.trim()}
          >
            {aiLoading ? "Generating…" : "Generate Vow"}
          </Button>
        </Box>
      )}

      {/* AI error */}
      {aiError && (
        <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
          {aiError}
        </Alert>
      )}

      {/* AI-generated editable result */}
      {method !== "write" && showAi && (
        <Box mt={2}>
          {aiLoading ? (
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Generating vow…
              </Typography>
            </Stack>
          ) : (
            vowText && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Generated vow — feel free to edit:
                </Typography>
                <TextField
                  multiline
                  minRows={2}
                  fullWidth
                  value={vowText}
                  onChange={(e) => setVowText(e.target.value)}
                  sx={{ mb: 2 }}
                />
              </>
            )
          )}
        </Box>
      )}

      <Button
        variant="contained"
        onClick={() => onComplete(vowText.trim())}
        disabled={!canConfirm}
      >
        Confirm Vow
      </Button>
    </Box>
  );
}
