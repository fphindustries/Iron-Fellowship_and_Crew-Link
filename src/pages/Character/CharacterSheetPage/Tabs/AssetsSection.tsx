import { Box, Button, Grid, Typography, LinearProgress, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { AssetCard } from "components/features/assets/AssetCard";
import { AssetCardDialog } from "components/features/assets/AssetCardDialog";
import { AssetDocument } from "types/Asset.type";
import { useConfirm } from "material-ui-confirm";
import { useStore } from "stores/store";
import { SectionHeading } from "components/shared/SectionHeading";
import { useGameSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { ignoreApiError } from "config/api.config";
import {
  useUpdateCharacterAssetMutation,
  useUpdateCharacterMutation,
} from "hooks/queries/useCharactersQuery";
import { useUpdateCampaignAssetMutation } from "hooks/queries/useCampaignsQuery";

export function AssetsSection() {
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

  // Identity fields
  const storedRole = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.role ?? ""
  );
  const storedPronouns = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.pronouns ?? ""
  );
  const storedCallsign = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.callsign ?? ""
  );
  const storedCharacteristics = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.characteristics ?? ""
  );
  const updateCurrentCharacter = useUpdateCharacterMutation(characterId ?? "");

  const [role, setRole] = useState(storedRole);
  const [pronouns, setPronouns] = useState(storedPronouns);
  const [callsign, setCallsign] = useState(storedCallsign);
  const [characteristics, setCharacteristics] = useState(storedCharacteristics);
  const [identitySaving, setIdentitySaving] = useState(false);

  useEffect(() => {
    setRole(storedRole);  
    setPronouns(storedPronouns);
    setCallsign(storedCallsign);
    setCharacteristics(storedCharacteristics);
  }, [storedRole, storedPronouns, storedCallsign, storedCharacteristics]);

  const handleIdentitySave = () => {
    setIdentitySaving(true);
    updateCurrentCharacter
      .mutateAsync({
        role,
        pronouns,
        callsign,
        characteristicsJson: characteristics,
      })
      .catch(ignoreApiError)
      .finally(() => setIdentitySaving(false));
  };

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
      <Box px={2} pt={2} pb={1}>
        <Box display="flex" gap={2} flexWrap="wrap" mb={1.5}>
          <TextField
            label="Role"
            size="small"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Pilot, Engineer"
            sx={{ maxWidth: 180 }}
          />
          <TextField
            label="Pronouns"
            size="small"
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            placeholder="they/them"
            sx={{ maxWidth: 180 }}
          />
          <TextField
            label="Callsign"
            size="small"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value)}
            placeholder="e.g. Ghost, Ember"
            sx={{ maxWidth: 180 }}
          />
        </Box>
        <TextField
          label="Characteristics"
          size="small"
          value={characteristics}
          onChange={(e) => setCharacteristics(e.target.value)}
          placeholder="e.g. Ace pilot with a grudge, Cybernetic eye, wears a bright red flight suit"
          fullWidth
          multiline
          minRows={2}
          sx={{ mb: 1.5 }}
        />
        <Box display="flex" justifyContent="flex-end" >
          <Button
            variant="contained"
            size="small"
            onClick={handleIdentitySave}
            disabled={identitySaving}
          >
            {identitySaving ? "Saving…" : "Save"}
          </Button>
        </Box>
      </Box>

      {isInCampaign && isStarforged && (
        <>
          <SectionHeading
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
          />
          {sortedSharedAssetKeys.length > 0 ? (
            <Grid
              sx={{
                p: 2,
              }}
              container
              spacing={2}
            >
              {sortedSharedAssetKeys.map((assetId, index) => (
                <Grid
                  key={index}
                  item
                  xs={12}
                  sm={6}
                  xl={4}
                  sx={{ display: "flex", justifyContent: "center" }}
                >
                  <AssetCard
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
        </>
      )}
      <SectionHeading
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
      />
      {sortedAssetKeys.length > 0 ? (
        <Grid
          sx={{
            p: 2,
          }}
          container
          spacing={2}
        >
          {sortedAssetKeys.map((assetId, index) => (
            <Grid
              key={index}
              item
              xs={12}
              sm={6}
              xl={4}
              sx={{ display: "flex", justifyContent: "center" }}
            >
              <AssetCard
                assetId={assets[assetId].id}
                storedAsset={assets[assetId]}
                onAssetRemove={() => handleClick(assetId, false)}
                onAssetAbilityToggle={(abilityIndex, checked) =>
                  handleAssetAbilityToggle(
                    assetId,
                    false,
                    abilityIndex,
                    checked
                  )
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
            </Grid>
          ))}
        </Grid>
      ) : assetsLoading ? (
        <LinearProgress sx={{ mb: 4 }} />
      ) : (
        <Box p={2} display={"flex"} justifyContent={"center"}>
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
