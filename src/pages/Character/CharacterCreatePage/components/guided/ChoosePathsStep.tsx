import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import ListAltIcon from "@mui/icons-material/ListAlt";
import HandymanIcon from "@mui/icons-material/Handyman";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { AssetDocument } from "types/Asset.type";
import { PathRecommendation } from "types/AI.type";
import { recommendCharacterPaths } from "api/ai/recommendCharacterPaths";
import { useState } from "react";
import { useStore } from "stores/store";
import { AssetCard } from "components/features/assets/AssetCard";
import { AssetCardDialog } from "components/features/assets/AssetCardDialog";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";
import {
  BACKGROUNDS,
  Background,
  getBackgroundForRoll,
  resolvePathAssets,
} from "./backgrounds";

type Method = "table" | "random" | "manual" | "ai";

export interface ChoosePathsStepProps {
  onComplete: (assets: AssetDocument[]) => void;
}

export function ChoosePathsStep({ onComplete }: ChoosePathsStepProps) {
  const showAi = useAiGuide();
  const assetMap = useStore((store) => store.rules.assetMaps.assetMap);

  const [method, setMethod] = useState<Method>("table");
  const [selectedBackground, setSelectedBackground] =
    useState<Background | null>(null);
  const [previewAssets, setPreviewAssets] = useState<AssetDocument[] | null>(
    null
  );

  // Manual selection
  const [manualAssets, setManualAssets] = useState<AssetDocument[]>([]);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);

  // Random roll
  const [rollResult, setRollResult] = useState<number | null>(null);

  // AI
  const [description, setDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<
    PathRecommendation[] | null
  >(null);

  const handleMethodChange = (_: unknown, newMethod: Method | null) => {
    if (!newMethod) return;
    setMethod(newMethod);
    setSelectedBackground(null);
    setPreviewAssets(null);
    setManualAssets([]);
    setRollResult(null);
    setRecommendations(null);
    setAiError(null);
  };

  const selectBackground = (bg: Background) => {
    setSelectedBackground(bg);
    setPreviewAssets(resolvePathAssets(bg.assetNames, assetMap));
  };

  const handleRoll = () => {
    const roll = Math.ceil(Math.random() * 100);
    setRollResult(roll);
    const bg = getBackgroundForRoll(roll);
    if (bg) selectBackground(bg);
  };

  const handleManualAssetAdd = (asset: Omit<AssetDocument, "order">) => {
    if (manualAssets.length >= 2) return;
    const newAsset: AssetDocument = {
      ...asset,
      order: manualAssets.length,
    };
    const updated = [...manualAssets, newAsset];
    setManualAssets(updated);
    setAssetDialogOpen(false);
    if (updated.length === 2) setPreviewAssets(updated);
  };

  const handleManualRemove = (index: number) => {
    const updated = manualAssets.filter((_, i) => i !== index);
    setManualAssets(updated);
    setPreviewAssets(updated.length === 2 ? updated : null);
  };

  const handleGetRecommendations = async () => {
    if (!description.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setRecommendations(null);
    try {
      const result = await recommendCharacterPaths({ description });
      setRecommendations(result?.recommendations ?? []);
    } catch {
      setAiError("Failed to get recommendations. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!previewAssets || previewAssets.length !== 2) return;
    onComplete(previewAssets);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Choose Your 2 Path Assets
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Path assets define your character&apos;s background and skills. Choose
        2 to start.
      </Typography>

      <ToggleButtonGroup
        value={method}
        exclusive
        onChange={handleMethodChange}
        sx={{ flexWrap: "wrap", gap: 1, mb: 3 }}
      >
        <ToggleButton value="table" sx={{ gap: 0.5 }}>
          <ListAltIcon fontSize="small" />
          Pick a Background
        </ToggleButton>
        <ToggleButton value="random" sx={{ gap: 0.5 }}>
          <CasinoIcon fontSize="small" />
          Roll Randomly
        </ToggleButton>
        <ToggleButton value="manual" sx={{ gap: 0.5 }}>
          <HandymanIcon fontSize="small" />
          Choose Manually
        </ToggleButton>
        {showAi && (
          <ToggleButton value="ai" sx={{ gap: 0.5 }}>
            <AutoAwesomeIcon fontSize="small" />
            Describe My Character
          </ToggleButton>
        )}
      </ToggleButtonGroup>

      {/* Background table method */}
      {method === "table" && (
        <BackgroundTable
          selected={selectedBackground}
          onSelect={selectBackground}
        />
      )}

      {/* Random roll method */}
      {method === "random" && (
        <RandomRollPanel
          rollResult={rollResult}
          background={selectedBackground}
          onRoll={handleRoll}
        />
      )}

      {/* Manual selection method */}
      {method === "manual" && (
        <ManualPanel
          assets={manualAssets}
          onAdd={() => setAssetDialogOpen(true)}
          onRemove={handleManualRemove}
        />
      )}

      {/* AI method */}
      {method === "ai" && showAi && (
        <AiPanel
          description={description}
          onDescriptionChange={setDescription}
          loading={aiLoading}
          error={aiError}
          recommendations={recommendations}
          onGetRecommendations={handleGetRecommendations}
          onSelectRecommendation={(rec) => {
            const bg = BACKGROUNDS.find((b) => b.name === rec.backgroundName);
            if (bg) {
              selectBackground(bg);
            } else {
              // Fallback: resolve by asset names from recommendation
              const assets = resolvePathAssets(
                [rec.asset1, rec.asset2],
                assetMap
              );
              setSelectedBackground(null);
              setPreviewAssets(assets.length === 2 ? assets : null);
            }
          }}
          selectedBackground={selectedBackground}
          assetMap={assetMap}
        />
      )}

      {/* Preview & confirm */}
      {previewAssets && previewAssets.length === 2 && (
        <Box mt={3}>
          <Typography variant="subtitle2" gutterBottom>
            {selectedBackground
              ? `Selected: ${selectedBackground.name}`
              : "Selected paths:"}
          </Typography>
          <Grid container spacing={2} mb={2}>
            {previewAssets.map((asset) => (
              <Grid item xs={12} sm={6} key={asset.id}>
                <AssetCard assetId={asset.id} storedAsset={asset} />
              </Grid>
            ))}
          </Grid>
          <Button variant="contained" onClick={handleConfirm}>
            Confirm Selection
          </Button>
        </Box>
      )}

      <AssetCardDialog
        open={assetDialogOpen}
        handleClose={() => setAssetDialogOpen(false)}
        handleAssetSelection={handleManualAssetAdd}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

function BackgroundTable({
  selected,
  onSelect,
}: {
  selected: Background | null;
  onSelect: (bg: Background) => void;
}) {
  return (
    <Box
      sx={{
        maxHeight: 320,
        overflowY: "auto",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      {BACKGROUNDS.map((bg) => (
        <Box
          key={bg.name}
          onClick={() => onSelect(bg)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2,
            py: 1,
            cursor: "pointer",
            bgcolor:
              selected?.name === bg.name ? "action.selected" : "transparent",
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
            {bg.rollMin}–{bg.rollMax}
          </Typography>
          <Typography variant="body2" sx={{ flex: 1 }}>
            {bg.name}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            {bg.assetNames.map((name) => (
              <Chip key={name} label={name} size="small" variant="outlined" />
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

function RandomRollPanel({
  rollResult,
  background,
  onRoll,
}: {
  rollResult: number | null;
  background: Background | null;
  onRoll: () => void;
}) {
  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<CasinoIcon />}
        onClick={onRoll}
        size="large"
      >
        Roll (1d100)
      </Button>
      {rollResult !== null && background && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Rolled <strong>{rollResult}</strong> — <strong>{background.name}</strong>
        </Alert>
      )}
    </Box>
  );
}

function ManualPanel({
  assets,
  onAdd,
  onRemove,
}: {
  assets: AssetDocument[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Select exactly 2 Path assets. ({assets.length}/2 selected)
      </Alert>
      {assets.length > 0 && (
        <Grid container spacing={2} mb={2}>
          {assets.map((asset, i) => (
            <Grid item xs={12} sm={6} key={asset.id}>
              <AssetCard
                assetId={asset.id}
                storedAsset={asset}
                onAssetRemove={() => onRemove(i)}
              />
            </Grid>
          ))}
        </Grid>
      )}
      {assets.length < 2 && (
        <Button variant="outlined" onClick={onAdd}>
          Add Path Asset
        </Button>
      )}
    </Box>
  );
}

import { Datasworn } from "@datasworn/core";

function AiPanel({
  description,
  onDescriptionChange,
  loading,
  error,
  recommendations,
  onGetRecommendations,
  onSelectRecommendation,
  selectedBackground,
  assetMap,
}: {
  description: string;
  onDescriptionChange: (v: string) => void;
  loading: boolean;
  error: string | null;
  recommendations: PathRecommendation[] | null;
  onGetRecommendations: () => void;
  onSelectRecommendation: (rec: PathRecommendation) => void;
  selectedBackground: Background | null;
  assetMap: Record<string, Datasworn.Asset>;
}) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        Describe the type of character you want to play, and the AI will
        suggest 3 matching backgrounds.
      </Typography>
      <TextField
        multiline
        minRows={3}
        fullWidth
        placeholder="e.g. A hardened soldier who left the military and now hunts criminals across the frontier..."
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        disabled={loading}
        sx={{ mb: 1.5 }}
      />
      <Button
        variant="outlined"
        startIcon={
          loading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />
        }
        onClick={onGetRecommendations}
        disabled={loading || !description.trim()}
      >
        {loading ? "Getting recommendations…" : "Get Recommendations"}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {recommendations && recommendations.length > 0 && (
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>
            Recommendations — click one to preview:
          </Typography>
          <Stack spacing={2}>
            {recommendations.map((rec) => {
              const asset1 = Object.values(assetMap).find(
                (a) =>
                  a.name.toUpperCase() === rec.asset1.toUpperCase() &&
                  a._id.includes("/path/")
              );
              const asset2 = Object.values(assetMap).find(
                (a) =>
                  a.name.toUpperCase() === rec.asset2.toUpperCase() &&
                  a._id.includes("/path/")
              );
              const isSelected =
                selectedBackground?.name === rec.backgroundName;
              return (
                <Card
                  key={rec.backgroundName}
                  variant="outlined"
                  sx={{
                    borderColor: isSelected ? "primary.main" : "divider",
                  }}
                >
                  <CardActionArea
                    onClick={() => onSelectRecommendation(rec)}
                    sx={{ p: 2 }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        mb={0.5}
                      >
                        <Typography variant="subtitle2">
                          {rec.backgroundName}
                        </Typography>
                        <Chip label={rec.asset1} size="small" />
                        <Chip label={rec.asset2} size="small" />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {rec.reasoning}
                      </Typography>
                      {(asset1 || asset2) && (
                        <Grid container spacing={1} mt={1}>
                          {asset1 && (
                            <Grid item xs={12} sm={6}>
                              <AssetCard
                                assetId={asset1._id}
                                sx={{ pointerEvents: "none" }}
                              />
                            </Grid>
                          )}
                          {asset2 && (
                            <Grid item xs={12} sm={6}>
                              <AssetCard
                                assetId={asset2._id}
                                sx={{ pointerEvents: "none" }}
                              />
                            </Grid>
                          )}
                        </Grid>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
