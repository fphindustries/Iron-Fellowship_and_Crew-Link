import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "stores/store";
import {
  AiMode,
  AiProviderName,
  AnthropicModelId,
  WorldAiSettings,
  WorldAiModeConfig,
} from "api-calls/ai/_ai.type";

const AI_MODES: { value: AiMode; label: string }[] = [
  { value: "storyGenerator", label: "Story Generator" },
  { value: "actionElaborator", label: "Action Elaborator" },
  { value: "stuckPlayer", label: "Stuck Player" },
  { value: "sessionRecap", label: "Session Recap" },
  { value: "bookkeeper", label: "Bookkeeper" },
];

const ANTHROPIC_MODELS: { value: AnthropicModelId; label: string }[] = [
  { value: "claude-haiku-4-5-20251001", label: "Haiku (faster, lower cost)" },
  { value: "claude-sonnet-4-20250514", label: "Sonnet (higher quality)" },
];

const HEAVY_MODES = new Set<AiMode>(["sessionRecap", "bookkeeper"]);

function getDefaultAnthropicModel(mode: AiMode): AnthropicModelId {
  return HEAVY_MODES.has(mode)
    ? "claude-sonnet-4-20250514"
    : "claude-haiku-4-5-20251001";
}

export function WorldAiSettingsSection() {
  const settings = useStore(
    (store) => store.worlds.currentWorld.worldAiSettings
  );
  const updateSettings = useStore(
    (store) => store.worlds.currentWorld.updateWorldAiSettings
  );

  const [provider, setProvider] = useState<AiProviderName>(
    settings?.provider ?? "openai"
  );
  const [worldTone, setWorldTone] = useState(
    settings?.worldTonePrompt ?? ""
  );
  const [modeConfigs, setModeConfigs] = useState<
    Partial<Record<AiMode, WorldAiModeConfig>>
  >(settings?.modeConfigs ?? {});

  // Sync from store when settings load
  useEffect(() => {
    if (settings) {
      setProvider(settings.provider ?? "openai");
      setWorldTone(settings.worldTonePrompt ?? "");
      setModeConfigs(settings.modeConfigs ?? {});
    }
  }, [settings]);

  // Debounced save
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const debouncedSave = useCallback(
    (partial: Partial<WorldAiSettings>) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        updateSettings(partial).catch(console.error);
      }, 800);
    },
    [updateSettings]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleProviderChange = (newProvider: AiProviderName) => {
    setProvider(newProvider);
    updateSettings({ provider: newProvider }).catch(console.error);
  };

  const handleWorldToneChange = (value: string) => {
    setWorldTone(value);
    debouncedSave({ worldTonePrompt: value });
  };

  const handleModeConfigChange = (
    mode: AiMode,
    field: keyof WorldAiModeConfig,
    value: string
  ) => {
    const updated = {
      ...modeConfigs,
      [mode]: {
        ...modeConfigs[mode],
        [field]: value,
      },
    };
    setModeConfigs(updated);
    debouncedSave({ modeConfigs: updated });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        AI Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Configure the AI provider, model preferences, and custom prompts for
        this world. These settings apply to all campaigns using this world.
      </Typography>

      <Stack spacing={3}>
        {/* Provider Selection */}
        <FormControl>
          <FormLabel>AI Provider</FormLabel>
          <RadioGroup
            row
            value={provider}
            onChange={(e) =>
              handleProviderChange(e.target.value as AiProviderName)
            }
          >
            <FormControlLabel
              value="openai"
              control={<Radio />}
              label="OpenAI (GPT)"
            />
            <FormControlLabel
              value="anthropic"
              control={<Radio />}
              label="Anthropic (Claude)"
            />
          </RadioGroup>
        </FormControl>

        {/* World Tone Prompt */}
        <TextField
          label="World Tone / Flavor"
          placeholder='e.g., "This is a grimdark setting where hope is scarce and every alliance has a price."'
          multiline
          minRows={2}
          maxRows={6}
          value={worldTone}
          onChange={(e) => handleWorldToneChange(e.target.value)}
          helperText="Custom tone injected into all AI prompts for this world."
        />

        {/* Per-Mode Configuration */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Per-Mode Configuration
          </Typography>
          {AI_MODES.map(({ value: mode, label }) => (
            <Accordion key={mode} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">{label}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {provider === "anthropic" && (
                    <FormControl size="small" fullWidth>
                      <FormLabel sx={{ mb: 0.5, fontSize: "0.85rem" }}>
                        Anthropic Model
                      </FormLabel>
                      <Select
                        value={
                          modeConfigs[mode]?.anthropicModel ??
                          getDefaultAnthropicModel(mode)
                        }
                        onChange={(e) =>
                          handleModeConfigChange(
                            mode,
                            "anthropicModel",
                            e.target.value
                          )
                        }
                      >
                        {ANTHROPIC_MODELS.map((m) => (
                          <MenuItem key={m.value} value={m.value}>
                            {m.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  <TextField
                    label="Custom Instructions"
                    placeholder={`e.g., "Focus on political intrigue and faction dynamics when generating ${label.toLowerCase()} content."`}
                    multiline
                    minRows={2}
                    maxRows={4}
                    size="small"
                    value={modeConfigs[mode]?.customInstructions ?? ""}
                    onChange={(e) =>
                      handleModeConfigChange(
                        mode,
                        "customInstructions",
                        e.target.value
                      )
                    }
                    helperText="Additional instructions appended to this mode's system prompt."
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Stack>
    </Box>
  );
}
