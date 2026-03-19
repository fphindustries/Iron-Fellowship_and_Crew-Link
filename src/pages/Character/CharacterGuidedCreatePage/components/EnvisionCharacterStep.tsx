import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useState } from "react";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";
import { randomizeCharacterAppearance } from "api-calls/ai/randomizeCharacterAppearance";
import { generateCharacterPortraits } from "api-calls/ai/generateCharacterPortraits";
import { WorldContext } from "api-calls/ai/_ai.type";
import { useStore } from "stores/store";

const PRONOUN_OPTIONS = ["he/him", "she/her", "they/them", "xe/xem"];
const CUSTOM_PRONOUNS_VALUE = "custom";

export interface EnvisionCharacterStepProps {
  onComplete: (data: {
    portrait?: { image: File; scale: number; position: { x: number; y: number } };
    look: string;
    act: string;
    wear: string;
    pronouns: string;
  }) => void;
  pathNames: string[];
  backstory: string;
  backgroundVow: string;
  initialLook?: string;
  initialAct?: string;
  initialWear?: string;
  initialPronouns?: string;
  worldContext?: WorldContext;
}

export function EnvisionCharacterStep({
  onComplete,
  pathNames,
  backstory,
  backgroundVow,
  initialLook,
  initialAct,
  initialWear,
  initialPronouns,
  worldContext,
}: EnvisionCharacterStepProps) {
  const showAi = useAiGuide();
  const portraitStyleAnchor = useStore(
    (s) => s.worlds.currentWorld.worldAiSettings?.portraitStyleAnchor
  );

  const [look, setLook] = useState(initialLook ?? "");
  const [act, setAct] = useState(initialAct ?? "");
  const [wear, setWear] = useState(initialWear ?? "");

  const resolvedInitialPronouns = initialPronouns ?? "they/them";
  const isInitialCustom =
    resolvedInitialPronouns !== "" &&
    !PRONOUN_OPTIONS.includes(resolvedInitialPronouns);
  const [pronouns, setPronouns] = useState(
    isInitialCustom ? CUSTOM_PRONOUNS_VALUE : resolvedInitialPronouns
  );
  const [customPronounsText, setCustomPronounsText] = useState(
    isInitialCustom ? resolvedInitialPronouns : ""
  );
  const [showCustom, setShowCustom] = useState(isInitialCustom);

  const [randomizeLoading, setRandomizeLoading] = useState(false);
  const [randomizeError, setRandomizeError] = useState<string | null>(null);

  const [portraitLoading, setPortraitLoading] = useState(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const handlePronounsChange = (_: React.MouseEvent, value: string | null) => {
    if (!value) return;
    if (value === CUSTOM_PRONOUNS_VALUE) {
      setShowCustom(true);
      setPronouns(CUSTOM_PRONOUNS_VALUE);
    } else {
      setShowCustom(false);
      setPronouns(value);
    }
  };

  const handleRandomize = async () => {
    setRandomizeLoading(true);
    setRandomizeError(null);
    try {
      const result = await randomizeCharacterAppearance({
        paths: pathNames,
        backstory,
        backgroundVow,
        worldContext,
      });
      if (result) {
        setLook(result.look);
        setAct(result.act);
        setWear(result.wear);
      }
      const randomPronoun =
        PRONOUN_OPTIONS[Math.floor(Math.random() * PRONOUN_OPTIONS.length)];
      setPronouns(randomPronoun);
      setShowCustom(false);
    } catch {
      setRandomizeError("Failed to generate suggestions. Please try again.");
    } finally {
      setRandomizeLoading(false);
    }
  };

  const handleGeneratePortraits = async () => {
    setPortraitLoading(true);
    setPortraitError(null);
    setGeneratedImages([]);
    setSelectedImageIndex(null);
    try {
      const result = await generateCharacterPortraits({
        look,
        act,
        wear,
        pronouns: effectivePronouns || undefined,
        paths: pathNames,
        portraitStyleAnchor,
      });
      if (result?.images?.length) {
        setGeneratedImages(result.images);
      }
    } catch {
      setPortraitError("Failed to generate portraits. Please try again.");
    } finally {
      setPortraitLoading(false);
    }
  };

  const effectivePronouns = showCustom ? customPronounsText : pronouns;

  const handleContinue = () => {
    let portrait:
      | { image: File; scale: number; position: { x: number; y: number } }
      | undefined;

    if (selectedImageIndex !== null && generatedImages[selectedImageIndex]) {
      const base64 = generatedImages[selectedImageIndex];
      const bytes = atob(base64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        arr[i] = bytes.charCodeAt(i);
      }
      const blob = new Blob([arr], { type: "image/png" });
      const file = new File([blob], "ai-portrait.png", { type: "image/png" });
      portrait = { image: file, scale: 1, position: { x: 0.5, y: 0.5 } };
    }

    onComplete({ portrait, look, act, wear, pronouns: effectivePronouns });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Envision Your Character
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Define one or two facts about your character&apos;s appearance,
        personality, and gear. You don&apos;t need much detail — discover the
        nuances through play.
      </Typography>

      <Stack spacing={2} mb={3}>
        <TextField
          label="Look"
          placeholder="e.g. Covered in tattoos; has a mechanical leg adorned with art"
          value={look}
          onChange={(e) => setLook(e.target.value)}
          fullWidth
          multiline
          maxRows={3}
        />
        <TextField
          label="Act"
          placeholder="e.g. Keen understanding of machines; often prefers them to people"
          value={act}
          onChange={(e) => setAct(e.target.value)}
          fullWidth
          multiline
          maxRows={3}
        />
        <TextField
          label="Wear"
          placeholder="e.g. Safety goggles and dirty coveralls"
          value={wear}
          onChange={(e) => setWear(e.target.value)}
          fullWidth
          multiline
          maxRows={3}
        />
      </Stack>

      <Box mb={3}>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Pronouns
        </Typography>
        <ToggleButtonGroup
          value={showCustom ? CUSTOM_PRONOUNS_VALUE : pronouns}
          exclusive
          onChange={handlePronounsChange}
          size="small"
          sx={{ flexWrap: "wrap", gap: 0.5 }}
        >
          {PRONOUN_OPTIONS.map((p) => (
            <ToggleButton key={p} value={p}>
              {p}
            </ToggleButton>
          ))}
          <ToggleButton value={CUSTOM_PRONOUNS_VALUE}>Custom</ToggleButton>
        </ToggleButtonGroup>
        {showCustom && (
          <TextField
            size="small"
            placeholder="e.g. fae/faer"
            value={customPronounsText}
            onChange={(e) => setCustomPronounsText(e.target.value)}
            sx={{ mt: 1, width: 200 }}
          />
        )}
      </Box>

      {showAi && (
        <Button
          variant="outlined"
          startIcon={
            randomizeLoading ? (
              <CircularProgress size={16} />
            ) : (
              <CasinoIcon />
            )
          }
          onClick={handleRandomize}
          disabled={randomizeLoading}
          sx={{ mb: 2 }}
        >
          {randomizeLoading ? "Randomizing…" : "Randomize"}
        </Button>
      )}

      {randomizeError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {randomizeError}
        </Alert>
      )}

      {showAi && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Portrait (optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            Generate a portrait for your character based on the details above.
          </Typography>

          <Button
            variant="outlined"
            startIcon={
              portraitLoading ? (
                <CircularProgress size={16} />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            onClick={handleGeneratePortraits}
            disabled={portraitLoading || !look.trim()}
          >
            {generatedImages.length > 0
              ? "Regenerate Headshots"
              : portraitLoading
              ? "Generating…"
              : "Generate Headshots"}
          </Button>

          {portraitError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {portraitError}
            </Alert>
          )}

          {generatedImages.length > 0 && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Click a portrait to select it:
              </Typography>
              <Grid container spacing={2}>
                {generatedImages.map((img, idx) => (
                  <Grid item xs={12} sm={4} key={idx}>
                    <Card
                      variant="outlined"
                      sx={{
                        outline:
                          selectedImageIndex === idx
                            ? "2px solid"
                            : "none",
                        outlineColor: "primary.main",
                      }}
                    >
                      <CardActionArea onClick={() => setSelectedImageIndex(idx)}>
                        <Box
                          component="img"
                          src={`data:image/png;base64,${img}`}
                          alt={`Portrait option ${idx + 1}`}
                          sx={{ width: "100%", display: "block" }}
                        />
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      )}

      <Button variant="contained" onClick={handleContinue}>
        Continue
      </Button>
    </Box>
  );
}
