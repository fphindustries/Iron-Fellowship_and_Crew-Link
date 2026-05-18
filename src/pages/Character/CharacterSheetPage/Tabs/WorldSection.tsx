import {
  Box,
  Button,
  Container,
  LinearProgress,
  Typography,
} from "@mui/material";
import { WorldSheet } from "components/features/worlds/WorldSheet";
import { WorldEmptyState } from "components/features/worlds/WorldEmptyState";
import { useStore } from "stores/store";
import { useState } from "react";
import { ignoreApiError } from "config/api.config";
import { useWorldsQuery } from "hooks/queries/useWorldsQuery";

export function WorldSection() {
  const uid = useStore((store) => store.auth.uid);

  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const world = useStore((store) => store.worlds.currentWorld.currentWorld);

  const campaignId = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.campaignId
  );
  const isWorldOwner = useStore(
    (store) =>
      store.worlds.currentWorld.currentWorld?.ownerIds.includes(
        store.auth.uid
      ) ?? false
  );

  const canEdit = !campaignId || isWorldOwner;

  const { data: ownedWorlds } = useWorldsQuery(uid);
  const sortedWorlds = (ownedWorlds ?? [])
    .slice()
    .sort((a, b) => b.name.localeCompare(a.name));
  const worldIds = sortedWorlds.map((w) => w.id);

  const updateCharacter = useStore(
    (store) => store.characters.currentCharacter.updateCurrentCharacter
  );

  const [updateCharacterWorldLoading, setUpdateCharacterWorldLoading] =
    useState(false);
  const updateCharacterWorld = (worldId?: string) => {
    setUpdateCharacterWorldLoading(true);
    updateCharacter({ worldId: worldId ?? null })
      .catch(ignoreApiError)
      .finally(() => {
        setUpdateCharacterWorldLoading(false);
      });
  };

  return (
    <Box>
      {worldId && world && (
        <Container sx={{ pb: 2 }}>
          {canEdit && (
            <Box
              sx={{
                py: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant={"h6"}>{world.name}</Typography>
              {!campaignId && (
                <Button
                  color={"inherit"}
                  onClick={() => updateCharacterWorld(undefined)}
                >
                  Remove World
                </Button>
              )}
            </Box>
          )}
          <WorldSheet canEdit={canEdit} hideCampaignHints />
        </Container>
      )}
      {worldId && !world && <LinearProgress />}
      {!worldId && !world && (
        <WorldEmptyState
          worldsToChooseFrom={canEdit ? sortedWorlds : undefined}
          onChooseWorld={(worldIndex) =>
            canEdit && updateCharacterWorld(worldIds[worldIndex])
          }
          worldUpdateLoading={updateCharacterWorldLoading}
          isOnWorldTab={canEdit}
        />
      )}
    </Box>
  );
}
