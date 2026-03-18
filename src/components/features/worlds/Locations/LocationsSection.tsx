import { useStore } from "stores/store";
import { FilterBar } from "../FilterBar";
import { Box, Button, Grid } from "@mui/material";
import AddLocationIcon from "@mui/icons-material/AddLocation";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useState } from "react";
import { useFilterLocations } from "./useFilterLocations";
import { WorldEmptyState } from "../WorldEmptyState";
import { LocationCard } from "./LocationCard";
import { LocationsSidebar } from "./LocationsSidebar";
import { useWorldPermissions } from "../useWorldPermissions";
import { OpenLocation } from "./OpenLocation";
import { ignoreApiError } from "api-calls/createApiFunction";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";
import { useGameSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { GenerateSectorDialog } from "components/features/worlds/SectorSection/GenerateSectorDialog";

export interface LocationsSectionProps {
  showHiddenTag?: boolean;
  openNPCTab: () => void;
  hideSidebar?: boolean;
}

export function LocationsSection(props: LocationsSectionProps) {
  const { openNPCTab, showHiddenTag, hideSidebar } = props;

  const { showGMTips } = useWorldPermissions();

  const shouldShowHiddenTag = showGMTips && showHiddenTag;

  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const locations = useStore(
    (store) => store.worlds.currentWorld.currentWorldLocations.locationMap
  );

  const search = useStore(
    (store) => store.worlds.currentWorld.currentWorldLocations.locationSearch
  );
  const setSearch = useStore(
    (store) => store.worlds.currentWorld.currentWorldLocations.setLocationSearch
  );

  const openLocationId = useStore(
    (store) => store.worlds.currentWorld.currentWorldLocations.openLocationId
  );
  const setOpenLocationId = useStore(
    (store) => store.worlds.currentWorld.currentWorldLocations.setOpenLocationId
  );
  const closeLocation = useStore(
    (store) => store.worlds.currentWorld.currentWorldLocations.closeLocation
  );

  const showAi = useAiGuide();
  const isStarforged =
    useGameSystem().gameSystem === GAME_SYSTEMS.STARFORGED;
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const [createLocationLoading, setCreateLocationLoading] = useState(false);
  const createLocation = useStore(
    (store) => store.worlds.currentWorld.currentWorldLocations.createLocation
  );

  const handleCreateLocation = () => {
    setCreateLocationLoading(true);
    createLocation()
      .then((locationId) => {
        setOpenLocationId(locationId);
      })
      .catch(ignoreApiError)
      .finally(() => setCreateLocationLoading(false));
  };
  const { filteredLocationIds, sortedLocationIds } = useFilterLocations(
    locations,
    search
  );

  if (!worldId) {
    return <WorldEmptyState />;
  }

  const openLocation = openLocationId && locations[openLocationId];

  if (openLocationId && openLocation) {
    return (
      <Box
        display={"flex"}
        alignItems={"stretch"}
        maxHeight={"100%"}
        height={"100%"}
        width={"100%"}
      >
        {!hideSidebar && (
          <LocationsSidebar
            locationIds={sortedLocationIds}
            locations={locations}
            openLocationId={openLocationId}
            setOpenLocationId={setOpenLocationId}
            showHiddenText={shouldShowHiddenTag ?? false}
          />
        )}
        <OpenLocation
          hideBorder={hideSidebar}
          worldId={worldId}
          locationId={openLocationId}
          location={openLocation}
          closeLocation={closeLocation}
          showHiddenTag={shouldShowHiddenTag}
          openNPCTab={openNPCTab}
        />
      </Box>
    );
  }

  return (
    <>
      {showAi && isStarforged && (
        <GenerateSectorDialog
          open={generateDialogOpen}
          onClose={() => setGenerateDialogOpen(false)}
        />
      )}
      <FilterBar
        search={search}
        setSearch={setSearch}
        action={
          <Box sx={{ display: "flex", gap: 1 }}>
            {showAi && isStarforged && (
              <Button
                variant={"outlined"}
                startIcon={<AutoAwesomeIcon />}
                onClick={() => setGenerateDialogOpen(true)}
                sx={{ flexShrink: 0 }}
              >
                Generate Sector
              </Button>
            )}
            <Button
              variant={"contained"}
              endIcon={<AddLocationIcon />}
              onClick={handleCreateLocation}
              disabled={createLocationLoading}
              sx={{ flexShrink: 0 }}
            >
              Add Location
            </Button>
          </Box>
        }
        searchPlaceholder={"Search by name or type"}
      />

      <Grid
        container
        spacing={2}
        sx={{
          p: 2,
        }}
      >
        {filteredLocationIds.map((locationId) =>
          locations[locationId] ? (
            <Grid item xs={12} md={6} lg={4} key={locationId}>
              <LocationCard
                key={locationId}
                location={locations[locationId]}
                onClick={() => setOpenLocationId(locationId)}
                showHiddenTag={shouldShowHiddenTag}
              />
            </Grid>
          ) : null
        )}
      </Grid>
    </>
  );
}
