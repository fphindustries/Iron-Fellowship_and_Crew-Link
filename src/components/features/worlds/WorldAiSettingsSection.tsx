import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useCallback, useEffect, useRef, useState } from "react";
import { ignoreApiError } from "config/api.config";
import { useStore } from "stores/store";
import { AiMode, WorldAiModeConfig } from "types/AI.type";

const AI_MODES: { value: AiMode; label: string }[] = [
  { value: "storyGenerator", label: "Story Generator" },
  { value: "actionElaborator", label: "Action Elaborator" },
  { value: "stuckPlayer", label: "Stuck Player" },
  { value: "sessionRecap", label: "Session Recap" },
  { value: "bookkeeper", label: "Bookkeeper" },
];

export function WorldAiSettingsSection() {
  const settings = useStore(
    (store) => store.worlds.currentWorld.worldAiSettings
  );
  const updateSettings = useStore(
    (store) => store.worlds.currentWorld.updateWorldAiSettings
  );

  const [worldTone, setWorldTone] = useState(settings?.worldTonePrompt ?? "");
  const [portraitStyleAnchor, setPortraitStyleAnchor] = useState(
    settings?.portraitStyleAnchor ?? ""
  );
  const [modeConfigs, setModeConfigs] = useState<
    Partial<Record<AiMode, WorldAiModeConfig>>
  >(settings?.modeConfigs ?? {});

  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (settings && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setWorldTone(settings.worldTonePrompt ?? "");
      setPortraitStyleAnchor(settings.portraitStyleAnchor ?? "");
      setModeConfigs(settings.modeConfigs ?? {});
    }
  }, [settings]);

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
      if (portraitStyleTimeoutRef.current) clearTimeout(portraitStyleTimeoutRef.current);
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
      if (portraitStyleTimeoutRef.current) clearTimeout(portraitStyleTimeoutRef.current);
      if (modeConfigTimeoutRef.current) clearTimeout(modeConfigTimeoutRef.current);
    };
  }, []);

  const handleModeConfigChange = (mode: AiMode, value: string) => {
    const updated = {
      ...modeConfigs,
      [mode]: { ...modeConfigs[mode], customInstructions: value },
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
        Configure custom prompts and tone for AI features in this world. The AI
        provider is selected at the system level.
      </Typography>

      <Stack spacing={3}>
        <TextField
          label="World Tone / Flavor"
          placeholder='e.g., "This is a grimdark setting where hope is scarce and every alliance has a price."'
          multiline
          minRows={2}
          maxRows={6}
          value={worldTone}
          onChange={(e) => {
            setWorldTone(e.target.value);
            debouncedSaveWorldTone(e.target.value);
          }}
          helperText="Custom tone injected into all AI prompts for this world."
        />

        <TextField
          label="Portrait Art Style"
          placeholder='e.g., "Destiny 2 concept art" or "painterly sci-fi illustration, muted tones"'
          multiline
          minRows={2}
          maxRows={4}
          value={portraitStyleAnchor}
          onChange={(e) => {
            setPortraitStyleAnchor(e.target.value);
            debouncedSavePortraitStyle(e.target.value);
          }}
          helperText="Style anchor injected into AI portrait prompts for characters in this world."
        />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Per-Mode Custom Instructions
          </Typography>
          {AI_MODES.map(({ value: mode, label }) => (
            <Accordion key={mode} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">{label}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  label="Custom Instructions"
                  placeholder={`e.g., "Focus on political intrigue and faction dynamics when generating ${label.toLowerCase()} content."`}
                  multiline
                  minRows={2}
                  maxRows={4}
                  size="small"
                  fullWidth
                  value={modeConfigs[mode]?.customInstructions ?? ""}
                  onChange={(e) => handleModeConfigChange(mode, e.target.value)}
                  helperText="Additional instructions appended to this mode's system prompt."
                />
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Stack>
    </Box>
  );
}
