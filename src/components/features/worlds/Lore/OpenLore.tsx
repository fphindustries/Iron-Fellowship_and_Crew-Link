import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useConfirm } from "material-ui-confirm";
import { RtcRichTextEditor } from "components/shared/RichTextEditor/RtcRichTextEditor";
import { LoreTagsAutocomplete } from "./LoreTagsAutocomplete";
import { useStore } from "stores/store";
import { LoreDocumentWithGMProperties } from "stores/world/currentWorld/lore/lore.slice.type";
import { useListenToCurrentLoreDocument } from "stores/world/currentWorld/lore/useListenToCurrentLoreDocument";
import { useWorldPermissions } from "../useWorldPermissions";
import { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from "lib/storage.lib";
import { useSnackbar } from "providers/SnackbarProvider";
import { GuideAndPlayerHeader, GuideOnlyHeader } from "../common";
import { mergeIcons } from "components/shared/GameIcons/mergeIcons";
import { IconColors } from "types/Icon.type";
import { PageWithImage } from "../common/PageWithImage";
import { DebouncedOracleInput } from "components/shared/DebouncedOracleInput";
import { ignoreApiError } from "config/api.config";
import {
  useDeleteLoreMutation,
  useUpdateLoreMutation,
  useUpdateLoreNotesMutation,
} from "hooks/queries/useWorldEntitiesQuery";
import { fileToBase64 } from "lib/storage.lib";

export interface OpenLoreProps {
  worldId: string;
  loreId: string;
  lore: LoreDocumentWithGMProperties;
  closeLore: () => void;
  tagList: string[];
  hideBorder?: boolean;
}

export function OpenLore(props: OpenLoreProps) {
  const { worldId, loreId, lore, closeLore, tagList, hideBorder } = props;

  const { showGMFields, showGMTips, isGuidedGame } = useWorldPermissions();

  useListenToCurrentLoreDocument(loreId);

  const { error } = useSnackbar();
  const confirm = useConfirm();

  const updateLore = useUpdateLoreMutation(worldId);
  const updateLoreNotes = useUpdateLoreNotesMutation(worldId);
  const deleteLore = useDeleteLoreMutation(worldId);

  const updateLoreDocument = (partialLore: Partial<LoreDocumentWithGMProperties>) => {
    const {
      name,
      imageFilenames,
      updatedDate: _updatedDate,
      createdDate: _createdDate,
      ...dataJson
    } = partialLore as Partial<LoreDocumentWithGMProperties> & {
      imageFilenames?: string[];
    };
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (imageFilenames !== undefined) patch.imageFilenames = imageFilenames;
    if (Object.keys(dataJson).length > 0) patch.dataJson = dataJson;
    return updateLore.mutateAsync({ loreId, patch });
  };

  const handleLoreDelete = () => {
    confirm({
      title: `Delete ${lore.name}`,
      description:
        "Are you sure you want to delete this lore document? It will be deleted from ALL of your characters and campaigns that use this world. This cannot be undone.",
      confirmationText: "Delete",
      confirmationButtonProps: {
        variant: "contained",
        color: "error",
      },
    })
      .then(() => {
        deleteLore
          .mutateAsync(loreId)
          .catch(ignoreApiError)
          .then(() => {
            closeLore();
          });
      })
      .catch(ignoreApiError);
  };

  const onFileUpload = (file: File) => {
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        error(
          `File is too large. The max file size is ${MAX_FILE_SIZE_LABEL}.`
        );
        return;
      }
      fileToBase64(file)
        .then((imageUrl) =>
          updateLoreDocument({ imageFilenames: [imageUrl] }).catch(
            ignoreApiError
          )
        )
        .catch(ignoreApiError);
    }
  };

  const icon = mergeIcons(
    {
      key: "GiBookmarklet",
      color: IconColors.White,
    },
    undefined,
    lore.icon
  );

  return (
    <PageWithImage
      imageUrl={lore.imageUrl}
      icon={icon}
      actions={
        <>
          {showGMFields && (
            <Tooltip title={"Delete"}>
              <IconButton onClick={() => handleLoreDelete()}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </>
      }
      name={lore.name}
      nameInput={
        <DebouncedOracleInput
          oracleTableId={""}
          label={"Name"}
          variant={"outlined"}
          color={"primary"}
          initialValue={lore.name}
          updateValue={(newName) =>
            updateLoreDocument({ name: newName })
              .then(() => undefined)
              .catch(ignoreApiError)
          }
          fullWidth={true}
          sx={{
            mt: 1,
          }}
        />
      }
      handleImageUpload={onFileUpload}
      handleIconSelection={(icon) => {
        if (lore.imageUrl) {
          updateLoreDocument({ imageFilenames: [] }).catch(ignoreApiError);
        }
        updateLoreDocument({ icon }).catch(ignoreApiError);
      }}
      handleImageRemove={() =>
        updateLoreDocument({ imageFilenames: [] })
          .then(() => undefined)
          .catch(ignoreApiError)
      }
      handlePageClose={closeLore}
      hideBorder={hideBorder}
    >
      <Box display={"flex"} flexDirection={"column"}>
        <Box mt={1}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} lg={6}>
              <LoreTagsAutocomplete
                tagList={tagList}
                tags={lore.tags}
                updateTags={(tags) =>
                  updateLoreDocument({ tags }).catch(ignoreApiError)
                }
              />
            </Grid>
            {showGMFields && (
              <>
                {showGMTips && (
                  <Grid item xs={12}>
                    <GuideOnlyHeader breakContainer />
                  </Grid>
                )}
                {isGuidedGame && (
                  <Grid
                    item
                    xs={12}
                    md={6}
                    sx={{ alignItems: "center", display: "flex" }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={lore.sharedWithPlayers ?? false}
                          onChange={(evt, value) =>
                            updateLoreDocument({
                              sharedWithPlayers: value,
                            }).catch(ignoreApiError)
                          }
                        />
                      }
                      label="Visible to Players"
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <RtcRichTextEditor
                    id={loreId}
                    roomPrefix={`iron-fellowship-${worldId}-lore-gmnotes-`}
                    documentPassword={worldId}
                    onSave={(_documentId, notes) =>
                      updateLoreNotes
                        .mutateAsync({
                        loreId,
                        gmProperties: { gmNotes: Array.from(notes) },
                      })
                        .then(() => undefined)
                    }
                    initialValue={lore.gmProperties?.gmNotes}
                  />
                </Grid>
              </>
            )}
            {isGuidedGame && (
              <>
                {showGMTips && (
                  <Grid item xs={12}>
                    <GuideAndPlayerHeader breakContainer />
                  </Grid>
                )}
                {!lore.sharedWithPlayers && (
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      These notes are not yet visible to players because this
                      location is hidden from them.
                    </Alert>
                  </Grid>
                )}
                <Grid item xs={12}>
                  {(lore.notes || lore.notes === null) && (
                    <RtcRichTextEditor
                      id={loreId}
                      roomPrefix={`iron-fellowship-${worldId}-lore-`}
                      documentPassword={worldId}
                      onSave={(_documentId, notes) =>
                        updateLoreNotes
                          .mutateAsync({ loreId, notes })
                          .then(() => undefined)
                      }
                      initialValue={lore.notes || undefined}
                    />
                  )}
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </Box>
    </PageWithImage>
  );
}
