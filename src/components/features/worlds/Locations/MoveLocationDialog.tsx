import {
  Button,
  Dialog,
  DialogContent,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { DialogTitleWithCloseButton } from "components/shared/DialogTitleWithCloseButton";
import { useStore } from "stores/store";
import { LocationWithGMProperties } from "stores/world/currentWorld/locations/locations.slice.type";
import { LocationItemAvatar } from "./LocationMap/LocationItemAvatar";
import { useState } from "react";
import { ignoreApiError } from "config/api.config";
import { useUpdateLocationMutation } from "hooks/queries/useWorldEntitiesQuery";
import { MapEntryType } from "types/Locations.type";

export interface MoveLocationDialogProps {
  open: boolean;
  onClose: () => void;
  locationId: string;
  location: LocationWithGMProperties;
}

export function MoveLocationDialog(props: MoveLocationDialogProps) {
  const { open, onClose, locationId, location } = props;

  const locationMap = useStore(
    (store) => store.worlds.currentWorld.currentWorldLocations.locationMap
  );
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const updateLocation = useUpdateLocationMutation(worldId);

  const sortedLocations = Object.keys(locationMap)
    .sort((a, b) => {
      // Sort by parent location first. If no parent location exists, sort it to the top.
      // If the parent locations are the same, sort by name.
      const aParent = locationMap[a]?.parentLocationId;
      const bParent = locationMap[b]?.parentLocationId;
      if (aParent && bParent) {
        if (aParent < bParent) {
          return -1;
        } else if (aParent > bParent) {
          return 1;
        } else {
          return locationMap[a].name.localeCompare(locationMap[b].name);
        }
      } else if (aParent) {
        return 1;
      } else if (bParent) {
        return -1;
      } else {
        return locationMap[a].name.localeCompare(locationMap[b].name);
      }
    })
    .filter(
      (lid) =>
        lid !== locationId &&
        !isLocationADescendantOf(lid, locationId, locationMap)
    );

  const [moveLoading, setMoveLoading] = useState(false);
  const handleMove = (newParentId?: string) => {
    setMoveLoading(true);
    moveLocation(newParentId)
      .then(() => {
        onClose();
      })
      .catch(ignoreApiError)
      .finally(() => {
        setMoveLoading(false);
      });
  };

  const buildLocationPatch = (
    targetLocation: LocationWithGMProperties,
    partialLocation: Partial<LocationWithGMProperties>
  ) => {
    const {
      name: _existingName,
      imageFilenames: _existingImageFilenames,
      gmProperties: _existingGMProperties,
      notes: _existingNotes,
      imageUrl: _existingImageUrl,
      mapBackgroundImageUrl: _existingMapBackgroundImageUrl,
      updatedDate: _existingUpdatedDate,
      createdDate: _existingCreatedDate,
      ...existingData
    } = targetLocation as Partial<LocationWithGMProperties> & {
      imageFilenames?: string[];
    };
    const {
      name,
      imageFilenames,
      gmProperties: _gmProperties,
      notes: _notes,
      imageUrl: _imageUrl,
      mapBackgroundImageUrl: _mapBackgroundImageUrl,
      updatedDate: _updatedDate,
      createdDate: _createdDate,
      ...nextData
    } = partialLocation as Partial<LocationWithGMProperties> & {
      imageFilenames?: string[];
    };
    const patch: Record<string, unknown> = {
      dataJson: { ...existingData, ...nextData },
    };
    if (name !== undefined) patch.name = name;
    if (imageFilenames !== undefined) patch.imageFilenames = imageFilenames;
    return patch;
  };

  const moveLocation = async (newParentId?: string) => {
    const updates: Promise<unknown>[] = [];
    const oldParentId = location.parentLocationId;
    if (oldParentId) {
      const parentLocation = locationMap[oldParentId];
      if (parentLocation?.map) {
        const newMap = JSON.parse(JSON.stringify(parentLocation.map));
        for (const row of Object.keys(newMap)) {
          for (const col of Object.keys(newMap[row])) {
            const entry = newMap[row][col];
            if (
              entry?.type === MapEntryType.Location &&
              entry.locationIds?.includes(locationId)
            ) {
              entry.locationIds = entry.locationIds.filter(
                (id: string) => id !== locationId
              );
            }
          }
        }
        updates.push(
          updateLocation.mutateAsync({
            locationId: oldParentId,
            patch: buildLocationPatch(parentLocation, { map: newMap }),
          })
        );
      }
    }

    updates.push(
      updateLocation.mutateAsync({
        locationId,
        patch: buildLocationPatch(location, {
          parentLocationId: newParentId ?? null,
        }),
      })
    );

    await Promise.all(updates);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitleWithCloseButton onClose={onClose}>
        Move Location
      </DialogTitleWithCloseButton>
      <DialogContent>
        <Grid container spacing={2}>
          {location.parentLocationId && (
            <>
              <Grid item xs={12}>
                <Button
                  variant={"outlined"}
                  color={"inherit"}
                  onClick={() => handleMove()}
                  disabled={moveLoading}
                >
                  Remove from Parent Location
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Divider>Or</Divider>
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <Typography>Move under an existing location:</Typography>
            <List>
              {sortedLocations.map((lid) => (
                <ListItem key={lid} disablePadding>
                  <ListItemButton
                    onClick={() => handleMove(lid)}
                    disabled={moveLoading}
                  >
                    <ListItemAvatar>
                      <LocationItemAvatar location={locationMap[lid]} />
                    </ListItemAvatar>
                    <ListItemText primary={locationMap[lid].name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}

function isLocationADescendantOf(
  locationId: string,
  parentId: string,
  locations: Record<string, LocationWithGMProperties>
) {
  let currentLocation: LocationWithGMProperties | undefined =
    locations[locationId];
  const seenParentIds = new Set<string>([locationId]);

  while (currentLocation) {
    const parentLocationId = currentLocation.parentLocationId;

    if (parentLocationId) {
      if (seenParentIds.has(parentLocationId)) {
        console.error(
          `Found loop in location hierarchy. ${locationId} -> ${parentLocationId}`
        );
        return false;
      }
      seenParentIds.add(parentLocationId);
    }

    if (parentLocationId === parentId) {
      return true;
    }

    currentLocation = currentLocation.parentLocationId
      ? locations[currentLocation.parentLocationId]
      : undefined;
  }
  return false;
}
