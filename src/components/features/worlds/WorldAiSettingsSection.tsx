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
import { ignoreApiError } from "config/api.config";
import { useStore } from "stores/store";
import {
  AiMode,
  AiProviderName,
  AnthropicModelId,
  WorldAiModeConfig,
} from "types/AI.type";

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
  const [portraitStyleAnchor, setPortraitStyleAnchor] = useState(
    settings?.portraitStyleAnchor ?? ""
  );
  const [modeConfigs, setModeConfigs] = useState<
    Partial<Record<AiMode, WorldAiModeConfig>>
  >(settings?.modeConfigs ?? {});

  // Only sync from store on initial load; ignore subsequent subscription updates
  // so in-progress edits are not overwritten by Firestore round-trips.
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (settings && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setProvider(settings.provider ?? "openai");
      setWorldTone(settings.worldTonePrompt ?? "");
      setPortraitStyleAnchor(settings.portraitStyleAnchor ?? "");
      setModeConfigs(settings.modeConfigs ?? {});
    }
  }, [settings]);

  // Separate debounce timers so concurrent edits to different fields don't cancel each other
  const worldToneTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const portraitStyleTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const modeConfigTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const debouncedSaveWorldTone = useCallback(
    (value: string) => {
      if (worldToneTimeoutRef.current) clearTimeout(worldToneTimeoutRef.current);
      worldToneTimeoutRef.current = setTimeout(() => {
        updateSettings({ worldTonePrompt: value }).catch(ignoreApiError);
      }, 800);
    },
    [updateSettings]
  );

  const debouncedSavePortraitStyle = useCallback(
    (value: string) => {
      if (portraitStyleTimeoutRef.current)
        clearTimeout(portraitStyleTimeoutRef.current);
      portraitStyleTimeoutRef.current = setTimeout(() => {
        updateSettings({ portraitStyleAnchor: value }).catch(ignoreApiError);
      }, 800);
    },
    [updateSettings]
  );

  const debouncedSaveModeConfigs = useCallback(
    (configs: Partial<Record<AiMode, WorldAiModeConfig>>) => {
      if (modeConfigTimeoutRef.current) clearTimeout(modeConfigTimeoutRef.current);
      modeConfigTimeoutRef.current = setTimeout(() => {
        updateSettings({ modeConfigs: configs }).catch(ignoreApiError);
      }, 800);
    },
    [updateSettings]
  );

  useEffect(() => {
    return () => {
      if (worldToneTimeoutRef.current) clearTimeout(worldToneTimeoutRef.current);
      if (portraitStyleTimeoutRef.current)
        clearTimeout(portraitStyleTimeoutRef.current);
      if (modeConfigTimeoutRef.current) clearTimeout(modeConfigTimeoutRef.current);
    };
  }, []);

  const handleProviderChange = (newProvider: AiProviderName) => {
    setProvider(newProvider);
    updateSettings({ provider: newProvider }).catch(ignoreApiError);
  };

  const handleWorldToneChange = (value: string) => {
    setWorldTone(value);
    debouncedSaveWorldTone(value);
  };

  const handlePortraitStyleChange = (value: string) => {
    setPortraitStyleAnchor(value);
    debouncedSavePortraitStyle(value);
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
    debouncedSaveModeConfigs(updated);
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

        {/* Portrait Art Style */}
        <TextField
          label="Portrait Art Style"
          placeholder='e.g., "Destiny 2 concept art" or "painterly sci-fi illustration, muted tones"'
          multiline
          minRows={2}
          maxRows={4}
          value={portraitStyleAnchor}
          onChange={(e) => handlePortraitStyleChange(e.target.value)}
          helperText="Style anchor injected into AI portrait prompts for characters in this world."
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
