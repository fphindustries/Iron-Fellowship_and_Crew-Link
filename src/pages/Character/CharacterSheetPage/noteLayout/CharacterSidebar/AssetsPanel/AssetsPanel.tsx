import { useGameSystem } from "hooks/useGameSystem";
import { SidebarHeading } from "../TracksPanel/SidebarHeading";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { useStore } from "stores/store";
import { useState } from "react";
import { AssetDocument } from "types/Asset.type";
import { useConfirm } from "material-ui-confirm";
import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { AssetCard } from "components/features/assets/AssetCard";
import { AssetCardDialog } from "components/features/assets/AssetCardDialog";
import { ignoreApiError } from "config/api.config";
import { useUpdateCampaignAssetMutation } from "hooks/queries/useCampaignsQuery";
import { useUpdateCharacterAssetMutation } from "hooks/queries/useCharactersQuery";

export function AssetsPanel() {
  const isStarforged = useGameSystem().gameSystem === GAME_SYSTEMS.STARFORGED;

  const isInCampaign = useStore(
    (store) => !!store.characters.currentCharacter.currentCharacter?.campaignId
  );
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );

  const assets = useStore(
    (store) => store.characters.currentCharacter.assets.assets ?? {}
  );
  const sortedAssetKeys = Object.keys(assets).sort(
    (k1, k2) => assets[k1].order - assets[k2].order
  );
  const nextAssetIndex =
    sortedAssetKeys.length > 0
      ? (assets[sortedAssetKeys[sortedAssetKeys.length - 1]].order ?? 0) + 1
      : 0;

  const assetsLoading = useStore(
    (store) => store.characters.currentCharacter.assets.loading
  );
  const updateAsset = useUpdateCharacterAssetMutation(characterId);

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

  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState<{
    open: boolean;
    addToCampaign?: boolean;
  }>({ open: false });

  const handleAssetAdd = (asset: AssetDocument) => {
    const shouldAddToCampaign = isAssetDialogOpen.addToCampaign;
    setAddAssetLoading(true);
    const promise = shouldAddToCampaign
      ? updateSharedAsset.mutateAsync({ dataJson: asset })
      : updateAsset.mutateAsync({ dataJson: asset });
    promise
      .catch(ignoreApiError)
      .finally(() => {
        setIsAssetDialogOpen({ open: false });
        setAddAssetLoading(false);
      });
  };

  const confirm = useConfirm();

  const handleClick = (assetId: string, isShared: boolean) => {
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
        if (isShared) {
          updateSharedAsset
            .mutateAsync({ assetId, remove: true })
            .catch(ignoreApiError);
        } else {
          updateAsset
            .mutateAsync({ assetId, remove: true })
            .catch(ignoreApiError);
        }
      })
      .catch(ignoreApiError);
  };

  const handleAssetAbilityToggle = (
    assetId: string,
    isShared: boolean,
    abilityIndex: number,
    checked: boolean
  ) => {
    const existing = isShared ? sharedAssets[assetId] : assets[assetId];
    if (!existing) return;
    const mutation = isShared ? updateSharedAsset : updateAsset;
    mutation
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
    isShared: boolean,
    optionKey: string,
    value: string
  ) => {
    const existing = isShared ? sharedAssets[assetId] : assets[assetId];
    if (!existing) return;
    const mutation = isShared ? updateSharedAsset : updateAsset;
    mutation
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
    isShared: boolean,
    controlKey: string,
    value: boolean | string | number
  ) => {
    const existing = isShared ? sharedAssets[assetId] : assets[assetId];
    if (!existing) return;
    const mutation = isShared ? updateSharedAsset : updateAsset;
    mutation
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
  return (
    <>
      {isInCampaign && isStarforged && (
        <>
          <SidebarHeading
            label={"Shared Assets"}
            action={
              <Button
                variant={"outlined"}
                color={"inherit"}
                onClick={() =>
                  setIsAssetDialogOpen({ open: true, addToCampaign: true })
                }
              >
                Add Shared Asset
              </Button>
            }
            sx={{ mb: 2 }}
          />
          {sortedSharedAssetKeys.length > 0 ? (
            <Stack spacing={2}>
              {sortedSharedAssetKeys.map((assetId, index) => (
                <AssetCard
                  key={index}
                  assetId={sharedAssets[assetId].id}
                  storedAsset={sharedAssets[assetId]}
                  onAssetRemove={() => handleClick(assetId, true)}
                  onAssetAbilityToggle={(abilityIndex, checked) =>
                    handleAssetAbilityToggle(
                      assetId,
                      true,
                      abilityIndex,
                      checked
                    )
                  }
                  onAssetOptionChange={(optionKey, value) =>
                    handleAssetOptionChange(assetId, true, optionKey, value)
                  }
                  onAssetControlChange={(controlKey, value) =>
                    handleAssetControlChange(assetId, true, controlKey, value)
                  }
                  sx={{
                    minHeight: 450,
                    width: "100%",
                  }}
                />
              ))}
            </Stack>
          ) : sharedAssetsLoading ? (
            <LinearProgress sx={{ mb: 4 }} />
          ) : (
            <Box pb={4} display={"flex"} justifyContent={"center"}>
              <Typography>No Assets Found</Typography>
            </Box>
          )}
        </>
      )}
      <SidebarHeading
        label={"Character Assets"}
        action={
          <Button
            variant={"outlined"}
            color={"inherit"}
            onClick={() => setIsAssetDialogOpen({ open: true })}
          >
            Add Asset
          </Button>
        }
        sx={{ mb: 2 }}
      />
      {sortedAssetKeys.length > 0 ? (
        <Stack spacing={2}>
          {sortedAssetKeys.map((assetId, index) => (
            <AssetCard
              key={index}
              assetId={assets[assetId].id}
              storedAsset={assets[assetId]}
              onAssetRemove={() => handleClick(assetId, false)}
              onAssetAbilityToggle={(abilityIndex, checked) =>
                handleAssetAbilityToggle(assetId, false, abilityIndex, checked)
              }
              onAssetOptionChange={(optionKey, value) =>
                handleAssetOptionChange(assetId, false, optionKey, value)
              }
              onAssetControlChange={(controlKey, value) =>
                handleAssetControlChange(assetId, false, controlKey, value)
              }
              sx={{
                minHeight: 450,
                width: "100%",
              }}
            />
          ))}
        </Stack>
      ) : assetsLoading ? (
        <LinearProgress sx={{ mb: 4 }} />
      ) : (
        <Box display={"flex"} justifyContent={"center"}>
          <Typography>No Assets Found</Typography>
        </Box>
      )}
      <AssetCardDialog
        open={isAssetDialogOpen.open}
        loading={addAssetLoading}
        handleClose={() => setIsAssetDialogOpen({ open: false })}
        handleAssetSelection={(asset) =>
          handleAssetAdd({
            ...asset,
            order: isAssetDialogOpen.addToCampaign
              ? nextSharedAssetIndex
              : nextAssetIndex,
          })
        }
      />
    </>
  );
}
