import { Autocomplete, Grid, TextField, Typography } from "@mui/material";
import { DebouncedOracleInput } from "components/shared/DebouncedOracleInput";
import {
  FieldConfig,
  FieldConfigsWithoutFunctions,
} from "config/locations.config";
import { useStore } from "stores/store";
import { LocationWithGMProperties } from "stores/world/currentWorld/locations/locations.slice.type";
import { ignoreApiError } from "config/api.config";
import {
  useUpdateLocationMutation,
  useUpdateLocationNotesMutation,
} from "hooks/queries/useWorldEntitiesQuery";

export interface LocationFieldProps {
  locationId: string;
  field: FieldConfig;
  location: LocationWithGMProperties;
  isGMField?: boolean;
}

export function LocationField(props: LocationFieldProps) {
  const { locationId, field, location, isGMField } = props;

  let fieldConfig: FieldConfigsWithoutFunctions;
  if (typeof field === "function") {
    fieldConfig = field(locationId, location);
  } else {
    fieldConfig = field;
  }

  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const updateLocation = useUpdateLocationMutation(worldId);
  const updateLocationNotes = useUpdateLocationNotesMutation(worldId);

  const buildLocationPatch = (
    partialLocation: Partial<LocationWithGMProperties>
  ) => {
    const {
      name,
      imageFilenames,
      gmProperties: _gmProperties,
      notes: _notes,
      imageUrl: _imageUrl,
      mapBackgroundImageUrl: _mapBackgroundImageUrl,
      updatedDate: _updatedDate,
      createdDate: _createdDate,
      ...existingData
    } = location as Partial<LocationWithGMProperties> & {
      imageFilenames?: string[];
    };
    const {
      name: nextName,
      imageFilenames: nextImageFilenames,
      gmProperties: _nextGMProperties,
      notes: _nextNotes,
      imageUrl: _nextImageUrl,
      mapBackgroundImageUrl: _nextMapBackgroundImageUrl,
      updatedDate: _nextUpdatedDate,
      createdDate: _nextCreatedDate,
      ...nextData
    } = partialLocation as Partial<LocationWithGMProperties> & {
      imageFilenames?: string[];
    };

    const patch: Record<string, unknown> = {
      dataJson: { ...existingData, ...nextData },
    };
    if (nextName !== undefined) patch.name = nextName;
    if (nextImageFilenames !== undefined) {
      patch.imageFilenames = nextImageFilenames;
    }
    return patch;
  };

  const updateLocationDocument = (
    partialLocation: Partial<LocationWithGMProperties>
  ) =>
    updateLocation.mutateAsync({
      locationId,
      patch: buildLocationPatch(partialLocation),
    });

  const updateLocationGMProperties = (
    gmProperties: Partial<NonNullable<LocationWithGMProperties["gmProperties"]>>
  ) =>
    updateLocationNotes.mutateAsync({
      locationId,
      gmProperties: { ...(location.gmProperties ?? {}), ...gmProperties },
    });

  const value = isGMField
    ? location.gmProperties?.fields?.[fieldConfig.key]
    : location.fields?.[fieldConfig.key];

  const handleUpdate = (newValue: string) => {
    if (isGMField) {
      updateLocationGMProperties({
        fields: {
          ...(location.gmProperties?.fields ?? {}),
          [fieldConfig.key]: newValue,
        },
      }).catch(ignoreApiError);
    } else {
      updateLocationDocument({
        fields: {
          ...(location.fields ?? {}),
          [fieldConfig.key]: newValue,
        },
      }).catch(ignoreApiError);
    }
  };

  if (fieldConfig.type === "oracle") {
    return (
      <Grid
        item
        xs={12}
        md={fieldConfig.fullWidth ? undefined : 6}
        key={fieldConfig.key}
      >
        <DebouncedOracleInput
          label={fieldConfig.label}
          initialValue={value ?? ""}
          updateValue={(newValue) => handleUpdate(newValue)}
          oracleTableId={fieldConfig.oracleId}
        />
      </Grid>
    );
  } else if (fieldConfig.type === "autocomplete") {
    return (
      <Grid
        item
        xs={12}
        md={fieldConfig.fullWidth ? undefined : 6}
        key={fieldConfig.key}
      >
        <Autocomplete
          freeSolo
          options={fieldConfig.options}
          includeInputInList
          renderOption={(props, option) => <li {...props}>{option}</li>}
          value={value ?? ""}
          onChange={(evt, newValue) => handleUpdate(newValue ?? "")}
          renderInput={(params) => (
            <TextField {...params} label={fieldConfig.label} />
          )}
        />
      </Grid>
    );
  } else if (fieldConfig.type === "section-title") {
    return (
      <Grid item xs={12} key={fieldConfig.label}>
        <Typography variant={"overline"} sx={{ mt: 2 }}>
          {fieldConfig.label}
        </Typography>
      </Grid>
    );
  }

  return null;
}
