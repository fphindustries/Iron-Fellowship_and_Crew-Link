import {
  Box,
  Button,
  Container,
  LinearProgress,
  Typography,
} from "@mui/material";
import { WorldSheet } from "components/features/worlds/WorldSheet";
import { useConfirm } from "material-ui-confirm";
import { WorldEmptyState } from "components/features/worlds/WorldEmptyState";
import { useStore } from "stores/store";
import { useState } from "react";
import { useCampaignType } from "hooks/useCampaignType";
import { ignoreApiError } from "config/api.config";
import { useWorldsQuery } from "hooks/queries/useWorldsQuery";
import { useUpdateCampaignWorldMutation } from "hooks/queries/useCampaignsQuery";

export function WorldTab() {
  const confirm = useConfirm();
  const uid = useStore((store) => store.auth.uid);

  const { showGuidedPlayerView } = useCampaignType();

  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const world = useStore((store) => store.worlds.currentWorld.currentWorld);
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const gmIds = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.gmIds ?? []
  );

  const { data: ownedWorlds } = useWorldsQuery(uid);
  const sortedWorlds = (ownedWorlds ?? [])
    .slice()
    .sort((a, b) => b.name.localeCompare(a.name));
  const worldIds = sortedWorlds.map((w) => w.id);

  const updateCampaignWorld = useUpdateCampaignWorldMutation(campaignId);
  const [updateCampaignWorldLoading, setUpdateCampaignWorldLoading] =
    useState(false);

  const handleWorldRemove = () => {
    setUpdateCampaignWorldLoading(true);
    confirm({
      title: `Remove ${world?.name}`,
      description:
        "Are you sure you want to remove this world from the campaign? You will not be able to access locations or NPCs until you add another world.",
      confirmationText: "Remove",
      confirmationButtonProps: {
        variant: "contained",
        color: "error",
      },
    })
      .then(() => {
        updateCampaignWorld
          .mutateAsync({ worldId: null })
          .catch(ignoreApiError)
          .finally(() => {
            setUpdateCampaignWorldLoading(false);
          });
      })
      .catch(() => {
        setUpdateCampaignWorldLoading(false);
      });
  };

  return (
    <Box>
      {worldId && world && (
        <Container sx={{ pb: 2 }} maxWidth={false}>
          {!showGuidedPlayerView && (
            <Box
              sx={{
                py: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant={"h6"}>{world.name}</Typography>
              <Button color={"inherit"} onClick={() => handleWorldRemove()}>
                Remove World
              </Button>
            </Box>
          )}
          <WorldSheet canEdit={!showGuidedPlayerView} hideCampaignHints />
        </Container>
      )}
      {worldId && !world && <LinearProgress />}
      {!worldId && !world && (
        <WorldEmptyState
          isOnWorldTab
          worldsToChooseFrom={sortedWorlds}
          onChooseWorld={(worldIndex) => {
            setUpdateCampaignWorldLoading(true);
            updateCampaignWorld
              .mutateAsync({ worldId: worldIds[worldIndex], ownerIds: gmIds })
              .catch(ignoreApiError)
              .finally(() => setUpdateCampaignWorldLoading(false));
          }}
          worldUpdateLoading={updateCampaignWorldLoading}
        />
      )}
    </Box>
  );
}
