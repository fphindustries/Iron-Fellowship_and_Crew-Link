import { IconButton, Menu, MenuItem } from "@mui/material";
import { useRef, useState } from "react";
import { MapBackgroundImageFit, MapStrokeColors } from "types/Locations.type";
import OverflowMenuIcon from "@mui/icons-material/MoreHoriz";
import { useStore } from "stores/store";
import { useSnackbar } from "providers/SnackbarProvider";
import { useConfirm } from "material-ui-confirm";
import {
  fileToBase64,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_LABEL,
} from "lib/storage.lib";
import { ignoreApiError } from "config/api.config";
import { useUpdateLocationMutation } from "hooks/queries/useWorldEntitiesQuery";
import { LocationWithGMProperties } from "stores/world/currentWorld/locations/locations.slice.type";

export interface MapOverflowOptionsMenuProps {
  locationId: string;
  hasBackgroundImage: boolean;
  mapStrokeColor: MapStrokeColors;
  mapBackgroundImageFit: MapBackgroundImageFit;
}

export function MapOverflowOptionsMenu(props: MapOverflowOptionsMenuProps) {
  const {
    locationId,
    hasBackgroundImage,
    mapStrokeColor,
    mapBackgroundImageFit,
  } = props;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuParentRef = useRef<HTMLButtonElement>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);

  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const location = useStore(
    (store) =>
      store.worlds.currentWorld.currentWorldLocations.locationMap[locationId]
  );
  const updateLocation = useUpdateLocationMutation(worldId);

  const buildLocationPatch = (
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
    } = location as Partial<LocationWithGMProperties> & {
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

  const updateLocationDocument = (
    partialLocation: Partial<LocationWithGMProperties>
  ) => {
    if (!location) return Promise.reject("Location not found");
    return updateLocation.mutateAsync({
      locationId,
      patch: buildLocationPatch(partialLocation),
    });
  };

  const { error } = useSnackbar();
  const confirm = useConfirm();
  const handleFileUpload = (file: File) => {
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        error(
          `File is too large. The max file size is ${MAX_FILE_SIZE_LABEL}.`
        );
        return;
      }
      fileToBase64(file)
        .then((imageUrl) =>
          updateLocationDocument({
            mapBackgroundImageFilename: imageUrl,
          }).catch(ignoreApiError)
        )
        .catch(ignoreApiError);
    }
  };

  const handleFileRemove = () => {
    confirm({
      description: "Are you sure you want to remove the map background?",
      confirmationText: "Remove",
      confirmationButtonProps: {
        color: "error",
      },
    }).then(() => {
      updateLocationDocument({ mapBackgroundImageFilename: undefined }).catch(
        ignoreApiError
      );
    });
  };

  return (
    <>
      <IconButton
        color={"inherit"}
        ref={menuParentRef}
        onClick={() => setIsMenuOpen(true)}
      >
        <OverflowMenuIcon />
      </IconButton>
      <Menu
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        anchorEl={menuParentRef.current}
      >
        <MenuItem
          onClick={() => {
            setIsMenuOpen(false);
            mapInputRef.current?.click();
          }}
        >
          {hasBackgroundImage ? "Replace" : "Upload"} Background Image
        </MenuItem>
        {hasBackgroundImage && (
          <MenuItem
            onClick={() => {
              setIsMenuOpen(false);
              handleFileRemove();
            }}
          >
            Remove Background Image
          </MenuItem>
        )}
        {hasBackgroundImage && (
          <MenuItem
            onClick={() => {
              setIsMenuOpen(false);
              updateLocationDocument({
                mapStrokeColor:
                  mapStrokeColor === MapStrokeColors.Dark
                    ? MapStrokeColors.Light
                    : MapStrokeColors.Dark,
              }).catch(ignoreApiError);
            }}
          >
            Use {mapStrokeColor === MapStrokeColors.Dark ? "Light" : "Dark"}{" "}
            Line Colors
          </MenuItem>
        )}
        {hasBackgroundImage && (
          <MenuItem
            onClick={() => {
              setIsMenuOpen(false);
              updateLocationDocument({
                mapBackgroundImageFit:
                  mapBackgroundImageFit === MapBackgroundImageFit.Contain
                    ? MapBackgroundImageFit.Cover
                    : MapBackgroundImageFit.Contain,
              }).catch(ignoreApiError);
            }}
          >
            {mapBackgroundImageFit === MapBackgroundImageFit.Contain
              ? "Crop image to default grid size"
              : "Resize grid to fit image"}
          </MenuItem>
        )}
      </Menu>
      <input
        ref={mapInputRef}
        hidden
        accept="image/*"
        multiple
        type="file"
        onChange={(evt) => {
          const file = evt.target.files?.[0];
          if (file) {
            handleFileUpload(file);
          }
        }}
      />
    </>
  );
}
