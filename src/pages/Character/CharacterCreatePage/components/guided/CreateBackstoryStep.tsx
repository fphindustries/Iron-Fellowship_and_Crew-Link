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
import ListAltIcon from "@mui/icons-material/ListAlt";
import CasinoIcon from "@mui/icons-material/Casino";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useState } from "react";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";
import { generateCharacterBackstory } from "api/ai/generateCharacterBackstory";
import { WorldContext } from "types/AI.type";
import {
  BACKSTORY_PROMPTS,
  BackstoryPrompt,
  getPromptForRoll,
} from "./backstoryPrompts";

type Method = "write" | "table" | "random" | "custom";

export interface CreateBackstoryStepProps {
  onComplete: (backstory: string) => void;
  worldContext?: WorldContext;
}

export function CreateBackstoryStep({ onComplete, worldContext }: CreateBackstoryStepProps) {
  const showAi = useAiGuide();

  const [method, setMethod] = useState<Method>("write");
  const [backstory, setBackstory] = useState("");
  const [selectedPrompt, setSelectedPrompt] =
    useState<BackstoryPrompt | null>(null);
  const [customPromptText, setCustomPromptText] = useState("");
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleMethodChange = (_: unknown, newMethod: Method | null) => {
    if (!newMethod) return;
    setMethod(newMethod);
    setBackstory("");
    setSelectedPrompt(null);
    setRollResult(null);
    setAiError(null);
  };

  const generateFromPrompt = async (prompt: string) => {
    setAiLoading(true);
    setAiError(null);
    setBackstory("");
    try {
      const result = await generateCharacterBackstory({ prompt, worldContext });
      setBackstory(result?.backstory ?? "");
    } catch {
      setAiError("Failed to generate backstory. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleTableSelect = (bp: BackstoryPrompt) => {
    setSelectedPrompt(bp);
    setBackstory("");
    setAiError(null);
  };

  const handleRoll = () => {
    const roll = Math.ceil(Math.random() * 100);
    setRollResult(roll);
    const bp = getPromptForRoll(roll);
    if (bp) {
      setSelectedPrompt(bp);
      generateFromPrompt(bp.prompt);
    }
  };

  const canConfirm = backstory.trim().length > 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Create Your Backstory
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Your character is a person with few ties to others. The Forge is a vast
        galaxy, and your former home is lost to you, forsaken, or a distant
        memory. Keep it simple — you can discover more through play.
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
          <>
            <ToggleButton value="table" sx={{ gap: 0.5 }}>
              <ListAltIcon fontSize="small" />
              Pick a Prompt
            </ToggleButton>
            <ToggleButton value="random" sx={{ gap: 0.5 }}>
              <CasinoIcon fontSize="small" />
              Roll Randomly
            </ToggleButton>
            <ToggleButton value="custom" sx={{ gap: 0.5 }}>
              <AutoAwesomeIcon fontSize="small" />
              Custom Prompt
            </ToggleButton>
          </>
        )}
      </ToggleButtonGroup>

      {/* Write your own */}
      {method === "write" && (
        <TextField
          multiline
          minRows={5}
          fullWidth
          placeholder="Write your backstory here..."
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          sx={{ mb: 2 }}
        />
      )}

      {/* Pick from table */}
      {method === "table" && showAi && (
        <PromptTablePanel
          selected={selectedPrompt}
          onSelect={handleTableSelect}
          onGenerate={() =>
            selectedPrompt && generateFromPrompt(selectedPrompt.prompt)
          }
          loading={aiLoading}
        />
      )}

      {/* Roll randomly */}
      {method === "random" && showAi && (
        <RandomRollPanel
          rollResult={rollResult}
          selectedPrompt={selectedPrompt}
          onRoll={handleRoll}
          loading={aiLoading}
        />
      )}

      {/* Custom prompt */}
      {method === "custom" && showAi && (
        <CustomPromptPanel
          value={customPromptText}
          onChange={setCustomPromptText}
          onGenerate={() => generateFromPrompt(customPromptText)}
          loading={aiLoading}
        />
      )}

      {/* AI error */}
      {aiError && (
        <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
          {aiError}
        </Alert>
      )}

      {/* AI-generated editable result (shown for non-write methods) */}
      {method !== "write" && showAi && (
        <Box mt={2}>
          {aiLoading ? (
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Generating backstory…
              </Typography>
            </Stack>
          ) : (
            backstory && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Generated backstory — feel free to edit:
                </Typography>
                <TextField
                  multiline
                  minRows={5}
                  fullWidth
                  value={backstory}
                  onChange={(e) => setBackstory(e.target.value)}
                  sx={{ mb: 2 }}
                />
              </>
            )
          )}
        </Box>
      )}

      <Button
        variant="contained"
        onClick={() => onComplete(backstory.trim())}
        disabled={!canConfirm}
      >
        Confirm Backstory
      </Button>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

function PromptTablePanel({
  selected,
  onSelect,
  onGenerate,
  loading,
}: {
  selected: BackstoryPrompt | null;
  onSelect: (bp: BackstoryPrompt) => void;
  onGenerate: () => void;
  loading: boolean;
}) {
  return (
    <Box>
      <Box
        sx={{
          maxHeight: 280,
          overflowY: "auto",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          mb: 2,
        }}
      >
        {BACKSTORY_PROMPTS.map((bp) => (
          <Box
            key={bp.rollMin}
            onClick={() => onSelect(bp)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 1,
              cursor: "pointer",
              bgcolor:
                selected?.rollMin === bp.rollMin
                  ? "action.selected"
                  : "transparent",
              "&:hover": { bgcolor: "action.hover" },
              borderBottom: 1,
              borderColor: "divider",
              "&:last-child": { borderBottom: 0 },
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ minWidth: 40 }}
            >
              {bp.rollMin}–{bp.rollMax}
            </Typography>
            <Typography variant="body2">{bp.prompt}</Typography>
          </Box>
        ))}
      </Box>
      <Button
        variant="outlined"
        startIcon={
          loading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />
        }
        onClick={onGenerate}
        disabled={!selected || loading}
      >
        {loading ? "Generating…" : "Generate Backstory"}
      </Button>
    </Box>
  );
}

function RandomRollPanel({
  rollResult,
  selectedPrompt,
  onRoll,
  loading,
}: {
  rollResult: number | null;
  selectedPrompt: BackstoryPrompt | null;
  onRoll: () => void;
  loading: boolean;
}) {
  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={
          loading ? <CircularProgress size={16} /> : <CasinoIcon />
        }
        onClick={onRoll}
        size="large"
        disabled={loading}
      >
        {loading ? "Generating…" : "Roll (1d100)"}
      </Button>
      {rollResult !== null && selectedPrompt && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Rolled <strong>{rollResult}</strong> —{" "}
          <em>{selectedPrompt.prompt}</em>
        </Alert>
      )}
    </Box>
  );
}

function CustomPromptPanel({
  value,
  onChange,
  onGenerate,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
  loading: boolean;
}) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        Describe the circumstances that shaped your character, and the AI will
        write a backstory.
      </Typography>
      <TextField
        multiline
        minRows={3}
        fullWidth
        placeholder="e.g. My character was a corporate spy who discovered their employer was exploiting a remote colony..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        sx={{ mb: 1.5 }}
      />
      <Button
        variant="outlined"
        startIcon={
          loading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />
        }
        onClick={onGenerate}
        disabled={loading || !value.trim()}
      >
        {loading ? "Generating…" : "Generate Backstory"}
      </Button>
    </Box>
  );
}
