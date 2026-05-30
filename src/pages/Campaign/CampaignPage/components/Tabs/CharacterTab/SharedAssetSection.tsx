import {
  Box,
  Button,
  Container,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { AssetDocument } from "types/Asset.type";
import { AssetCard } from "components/features/assets/AssetCard";
import { AssetCardDialog } from "components/features/assets/AssetCardDialog";
import { SectionHeading } from "components/shared/SectionHeading";
import { useGameSystem } from "hooks/useGameSystem";
import { useConfirm } from "material-ui-confirm";
import { useState } from "react";
import { useStore } from "stores/store";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { ignoreApiError } from "config/api.config";
import {
  useCampaignStarshipQuery,
  useUpdateCampaignAssetMutation,
} from "hooks/queries/useCampaignsQuery";
import { StarshipCard, StarshipDialog } from "./StarshipSection";

export function SharedAssetSection() {
  const isStarforged = useGameSystem().gameSystem === GAME_SYSTEMS.STARFORGED;

  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState<boolean>(false);
  const [isStarshipDialogOpen, setIsStarshipDialogOpen] = useState<boolean>(false);

  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId ?? ""
  );

  const { data: starship } = useCampaignStarshipQuery(
    isStarforged ? campaignId : undefined
  );

  const sharedAssets = useStore(
    (store) => store.campaigns.currentCampaign.assets.assets
  );
  const sortedSharedAssetKeys = Object.keys(sharedAssets).sort(
    (k1, k2) => sharedAssets[k1].order - sharedAssets[k2].order
  );
  const nextSharedAssetIndex =
    sortedSharedAssetKeys.length > 0
      ? (sharedAssets[sortedSharedAssetKeys[sortedSharedAssetKeys.length - 1]]
          .order ?? 0) + 1
      : 0;

  const sharedAssetsLoading = useStore(
    (store) => store.characters.currentCharacter.assets.loading
  );
  const updateSharedAsset = useUpdateCampaignAssetMutation(campaignId);

  const [addAssetLoading, setAddAssetLoading] = useState(false);

  const handleAssetAdd = (asset: AssetDocument) => {
    setAddAssetLoading(true);
    updateSharedAsset
      .mutateAsync({ dataJson: asset })
      .catch(ignoreApiError)
      .finally(() => {
        setIsAssetDialogOpen(false);
        setAddAssetLoading(false);
      });
  };

  const confirm = useConfirm();

  const handleClick = (assetId: string) => {
    confirm({
      title: "Delete Asset",
      description: "Are you sure you want to remove this asset?",
      confirmationText: "Delete",
      confirmationButtonProps: {
        variant: "contained",
        color: "error",
      },
    })
      .then(() => {
        updateSharedAsset
          .mutateAsync({ assetId, remove: true })
          .catch(ignoreApiError);
      })
      .catch(ignoreApiError);
  };

  const handleAssetAbilityToggle = (
    assetId: string,
    abilityIndex: number,
    checked: boolean
  ) => {
    const existing = sharedAssets[assetId];
    if (!existing) return;
    updateSharedAsset
      .mutateAsync({
        assetId,
        dataJson: {
          ...existing,
          enabledAbilities: {
            ...(existing.enabledAbilities ?? {}),
            [abilityIndex]: checked,
          },
        },
      })
      .catch(ignoreApiError);
  };

  const handleAssetOptionChange = (
    assetId: string,
    optionKey: string,
    value: string
  ) => {
    const existing = sharedAssets[assetId];
    if (!existing) return;
    updateSharedAsset
      .mutateAsync({
        assetId,
        dataJson: {
          ...existing,
          optionValues: { ...(existing.optionValues ?? {}), [optionKey]: value },
        },
      })
      .catch(ignoreApiError);
  };

  const handleAssetControlChange = (
    assetId: string,
    controlKey: string,
    value: boolean | string | number
  ) => {
    const existing = sharedAssets[assetId];
    if (!existing) return;
    updateSharedAsset
      .mutateAsync({
        assetId,
        dataJson: {
          ...existing,
          controlValues: {
            ...(existing.controlValues ?? {}),
            [controlKey]: value,
          },
        },
      })
      .catch(ignoreApiError);
  };

  if (!isStarforged) return null;

  const hasContent = sortedSharedAssetKeys.length > 0 || !!starship;

  return (
    <>
      <SectionHeading
        label={"Shared Assets"}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant={"outlined"}
              color={"inherit"}
              onClick={() => setIsStarshipDialogOpen(true)}
            >
              {starship ? "Edit Starship" : "Add Starship"}
            </Button>
            <Button
              variant={"outlined"}
              color={"inherit"}
              onClick={() => setIsAssetDialogOpen(true)}
            >
              Add Shared Asset
            </Button>
          </Stack>
        }
      />
      <Container maxWidth={false}>
        {hasContent ? (
          <Grid container spacing={2}>
            {starship && (
              <Grid
                item
                xs={12}
                lg={6}
                xl={4}
                sx={{ display: "flex", justifyContent: "center" }}
              >
                <StarshipCard
                  starship={starship}
                  onEdit={() => setIsStarshipDialogOpen(true)}
                />
              </Grid>
            )}
            {sortedSharedAssetKeys.map((assetId, index) => (
              <Grid
                key={index}
                item
                xs={12}
                lg={6}
                xl={4}
                sx={{ display: "flex", justifyContent: "center" }}
              >
                <AssetCard
                  assetId={sharedAssets[assetId].id}
                  storedAsset={sharedAssets[assetId]}
                  onAssetRemove={() => handleClick(assetId)}
                  onAssetAbilityToggle={(abilityIndex, checked) =>
                    handleAssetAbilityToggle(assetId, abilityIndex, checked)
                  }
                  onAssetOptionChange={(optionKey, value) =>
                    handleAssetOptionChange(assetId, optionKey, value)
                  }
                  onAssetControlChange={(controlKey, value) =>
                    handleAssetControlChange(assetId, controlKey, value)
                  }
                />
              </Grid>
            ))}
          </Grid>
        ) : sharedAssetsLoading ? (
          <LinearProgress sx={{ mb: 4 }} />
        ) : (
          <Box p={2} pb={4} display={"flex"} justifyContent={"center"}>
            <Typography>No Assets Found</Typography>
          </Box>
        )}
      </Container>

      <AssetCardDialog
        open={isAssetDialogOpen}
        loading={addAssetLoading}
        handleClose={() => setIsAssetDialogOpen(false)}
        handleAssetSelection={(asset) =>
          handleAssetAdd({
            ...asset,
            order: nextSharedAssetIndex,
          })
        }
      />

      <StarshipDialog
        open={isStarshipDialogOpen}
        onClose={() => setIsStarshipDialogOpen(false)}
        campaignId={campaignId}
        starship={starship ?? null}
      />
    </>
  );
}
