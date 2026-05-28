import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { ChangeEventHandler, useRef, useState } from "react";
import { useSnackbar } from "providers/SnackbarProvider/useSnackbar";
import { fileToBase64, MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from "lib/storage.lib";
import { StarshipImageDialog } from "./StarshipImageDialog";
import { CampaignStarship } from "hooks/queries/useCampaignsQuery";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";

export interface StarshipImageProps {
  starship: CampaignStarship | null;
  onSaveImage: (image: { url: string; position: { x: number; y: number }; scale: number }) => Promise<void>;
  saving: boolean;
  descriptionHint?: string;
}

export function StarshipImage({
  starship,
  onSaveImage,
  saving,
  descriptionHint,
}: StarshipImageProps) {
  const { error } = useSnackbar();
  const showAi = useAiGuide();
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImage = starship?.image ?? null;

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      error(`File is too large. Max size is ${MAX_FILE_SIZE_LABEL}.`);
      e.target.value = "";
      return;
    }
    try {
      const url = await fileToBase64(file);
      await onSaveImage({ url, position: { x: 0.5, y: 0.5 }, scale: 1 });
    } catch {
      error("Failed to upload image.");
    }
    e.target.value = "";
  };

  const handleAiSelect = (url: string) =>
    onSaveImage({ url, position: { x: 0.5, y: 0.5 }, scale: 1 });

  return (
    <>
      <Box>
        {currentImage ? (
          <Box
            component="img"
            src={currentImage.url}
            alt="Starship"
            sx={{
              width: "100%",
              maxWidth: 480,
              borderRadius: 1,
              display: "block",
              mb: 1,
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              maxWidth: 480,
              height: 200,
              bgcolor: "background.default",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              mb: 1,
            }}
          >
            <RocketLaunchIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No starship image yet
            </Typography>
          </Box>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {showAi && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setAiDialogOpen(true)}
              disabled={saving}
            >
              {saving ? <CircularProgress size={16} /> : "Generate Image"}
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            Upload Image
          </Button>
        </Stack>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Box>

      <StarshipImageDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        onSelect={handleAiSelect}
        initialDescription={descriptionHint}
      />
    </>
  );
}
