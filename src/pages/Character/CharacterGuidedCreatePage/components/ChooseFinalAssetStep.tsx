import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useState } from "react";
import { useStore } from "stores/store";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";
import { AssetDocument } from "types/Asset.type";
import { AssetCard } from "components/features/assets/AssetCard";
import { AssetCardDialog } from "components/features/assets/AssetCardDialog";
import { recommendFinalAsset } from "api/ai/recommendFinalAsset";
import { AssetRecommendation, WorldContext } from "types/AI.type";
import { Datasworn } from "@datasworn/core";

export interface ChooseFinalAssetStepProps {
  onComplete: (asset: AssetDocument) => void;
  pathNames: string[];
  backstory: string;
  backgroundVow: string;
  worldContext?: WorldContext;
}

function resolveAssetByName(
  name: string,
  assetMap: Record<string, Datasworn.Asset>
): AssetDocument | null {
  const asset = Object.values(assetMap).find(
    (a) => a.name.toUpperCase() === name.toUpperCase()
  );
  if (!asset) return null;
  const enabledAbilities: Record<number, boolean> = {};
  asset.abilities.forEach((_, idx) => {
    enabledAbilities[idx] = idx === 0;
  });
  return { id: asset._id, enabledAbilities, order: 0 };
}

export function ChooseFinalAssetStep({
  onComplete,
  pathNames,
  backstory,
  backgroundVow,
  worldContext,
}: ChooseFinalAssetStepProps) {
  const showAi = useAiGuide();
  const assetMap = useStore((s) => s.rules.assetMaps.assetMap);

  const [selectedAsset, setSelectedAsset] = useState<AssetDocument | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<
    AssetRecommendation[] | null
  >(null);

  const handleAssetSelection = (asset: Omit<AssetDocument, "order">) => {
    setSelectedAsset({ ...asset, order: 0 });
    setDialogOpen(false);
  };

  const handleRecommendationSelect = (rec: AssetRecommendation) => {
    const resolved = resolveAssetByName(rec.assetName, assetMap);
    if (resolved) {
      setSelectedAsset(resolved);
    }
  };

  const handleRecommend = async () => {
    setAiLoading(true);
    setAiError(null);
    setRecommendations(null);
    try {
      const availableAssets = Object.values(assetMap)
        .filter((a) => !a._id.includes("/path/"))
        .map((a) => a.name)
        .sort();
      const result = await recommendFinalAsset({
        paths: pathNames,
        backstory,
        backgroundVow,
        availableAssets,
        worldContext,
      });
      setRecommendations(result?.recommendations ?? []);
    } catch {
      setAiError("Failed to get recommendations. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Choose Your Final Asset
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Choose one more asset to round out your character — a companion, a
        command vehicle, a module, or anything else that fits your vision.
      </Typography>

      {!selectedAsset && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" mb={3}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Select an Asset
          </Button>
          {showAi && (
            <Button
              variant="outlined"
              startIcon={
                aiLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <AutoAwesomeIcon />
                )
              }
              onClick={handleRecommend}
              disabled={aiLoading}
            >
              {aiLoading ? "Recommending…" : "Recommend Assets"}
            </Button>
          )}
        </Stack>
      )}

      {aiError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {aiError}
        </Alert>
      )}

      {/* AI recommendations */}
      {!selectedAsset && recommendations && recommendations.length > 0 && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Recommendations — click one to select:
          </Typography>
          <Grid container spacing={2}>
            {recommendations.map((rec) => {
              const resolved = resolveAssetByName(rec.assetName, assetMap);
              return (
                <Grid item xs={12} md={4} key={rec.assetName}>
                  <Card
                    variant="outlined"
                    onClick={() => handleRecommendationSelect(rec)}
                    sx={{ cursor: "pointer" }}
                  >
                    <Box sx={{ pointerEvents: "none" }}>
                      {resolved ? (
                        <AssetCard
                          assetId={resolved.id}
                          storedAsset={resolved}
                        />
                      ) : (
                        <CardContent>
                          <Typography variant="subtitle2">
                            {rec.assetName}
                          </Typography>
                        </CardContent>
                      )}
                      <CardContent sx={{ pt: 0 }}>
                        <Typography variant="body2" color="text.secondary">
                          {rec.reasoning}
                        </Typography>
                      </CardContent>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Selected asset preview */}
      {selectedAsset && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Selected asset:
          </Typography>
          <Box sx={{ maxWidth: 320, mb: 2 }}>
            <AssetCard assetId={selectedAsset.id} storedAsset={selectedAsset} />
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => setSelectedAsset(null)}
            >
              Change Asset
            </Button>
            <Button
              variant="contained"
              onClick={() => onComplete(selectedAsset)}
            >
              Confirm
            </Button>
          </Stack>
        </Box>
      )}

      <AssetCardDialog
        open={dialogOpen}
        handleClose={() => setDialogOpen(false)}
        handleAssetSelection={handleAssetSelection}
      />
    </Box>
  );
}
