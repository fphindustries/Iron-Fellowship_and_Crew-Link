import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useEffect, useState } from "react";
import { generateStarshipImages } from "api/ai/generateStarshipImages";
import { LoadingButton } from "@mui/lab";

export interface StarshipImageDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (base64Url: string) => Promise<void>;
  initialDescription?: string;
}

export function StarshipImageDialog({
  open,
  onClose,
  onSelect,
  initialDescription = "",
}: StarshipImageDialogProps) {
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription(initialDescription);
      setImages([]);
      setSelectedIndex(null);
      setError(null);
    }
  }, [open, initialDescription]);

  const handleGenerate = () => {
    setLoading(true);
    setError(null);
    setImages([]);
    setSelectedIndex(null);
    generateStarshipImages(description)
      .then((res) => setImages(res.images))
      .catch(() => setError("Image generation failed. Please try again."))
      .finally(() => setLoading(false));
  };

  const handleConfirm = async () => {
    if (selectedIndex === null) return;
    setSaving(true);
    try {
      await onSelect(`data:image/png;base64,${images[selectedIndex]}`);
      onClose();
    } catch {
      setError("Failed to save image.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (loading || saving) return;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Generate Starship Image</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <TextField
            label="Describe your ship"
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. A scarred freighter with mismatched hull plating and a jury-rigged jump drive..."
            fullWidth
          />
          <Box>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={loading || !description.trim()}
              startIcon={loading ? <CircularProgress size={16} /> : undefined}
            >
              {loading ? "Generating..." : "Generate"}
            </Button>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {images.length > 0 && (
            <>
              <Typography variant="body2" color="text.secondary">
                Select an image:
              </Typography>
              <Grid container spacing={2}>
                {images.map((img, idx) => (
                  <Grid item xs={12} sm={4} key={idx}>
                    <Card
                      variant="outlined"
                      sx={{
                        outline: selectedIndex === idx ? "3px solid" : "none",
                        outlineColor: "primary.main",
                        position: "relative",
                      }}
                    >
                      <CardActionArea onClick={() => setSelectedIndex(idx)}>
                        <Box
                          component="img"
                          src={`data:image/png;base64,${img}`}
                          alt={`Option ${idx + 1}`}
                          sx={{ width: "100%", display: "block" }}
                        />
                        {selectedIndex === idx && (
                          <CheckCircleIcon
                            color="primary"
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              bgcolor: "background.paper",
                              borderRadius: "50%",
                            }}
                          />
                        )}
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          onClick={handleConfirm}
          disabled={selectedIndex === null}
          loading={saving}
        >
          Use This Image
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
