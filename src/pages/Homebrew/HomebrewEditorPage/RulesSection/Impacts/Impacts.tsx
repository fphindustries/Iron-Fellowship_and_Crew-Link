import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { HomebrewImpactCategoryDocument } from "types/homebrew/HomebrewImpacts.type";
import { ImpactCategoryDialog } from "./ImpactCategoryDialog";
import { useStore } from "stores/store";
import ViewIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useConfirm } from "material-ui-confirm";
import { ImpactDialog } from "./ImpactDialog";
import { ClampedMarkdownRenderer } from "components/shared/ClampedMarkdownRenderer";
import { ImpactPreviewDialog } from "./ImpactCategoryPreviewDialog";
import { ignoreApiError } from "config/api.config";
import {
  useCreateHomebrewContentMutation,
  useDeleteHomebrewContentMutation,
  useUpdateHomebrewContentMutation,
} from "hooks/queries/useHomebrewQuery";
import { HomebrewImpact } from "types/homebrew/HomebrewImpacts.type";

export interface ImpactsProps {
  homebrewId: string;
  isEditor: boolean;
}

export function Impacts(props: ImpactsProps) {
  const { homebrewId, isEditor } = props;
  const confirm = useConfirm();

  const impactCategories = useStore(
    (store) =>
      store.homebrew.collections[homebrewId]?.impactCategories?.data ?? {}
  );
  const isLoading = useStore(
    (store) => !store.homebrew.collections[homebrewId]?.impactCategories?.loaded
  );

  const [impactCategoryDialogOpen, setImpactCategoryDialogOpen] =
    useState(false);
  const [impactDialogOpen, setImpactDialogOpen] = useState(false);
  const [editingImpactCategoryKey, setEditingImpactCategoryKey] = useState<
    string | undefined
  >(undefined);
  const [editingImpactKey, setEditingImpactKey] = useState<string | undefined>(
    undefined
  );
  const [viewingImpactCategoryKey, setViewingImpactCategoryKey] = useState<
    string | undefined
  >(undefined);

  const createImpactCategory = useCreateHomebrewContentMutation(homebrewId);
  const updateImpactCategory = useUpdateHomebrewContentMutation(homebrewId);
  const deleteImpactCategory = useDeleteHomebrewContentMutation(homebrewId);

  const createOrUpdateImpactCategory = (
    impactCategory: HomebrewImpactCategoryDocument
  ) => {
    if (editingImpactCategoryKey) {
      return updateImpactCategory
        .mutateAsync({
          contentId: editingImpactCategoryKey,
          dataJson: impactCategory,
        })
        .then(() => undefined);
    } else {
      return createImpactCategory
        .mutateAsync({
          contentType: "impact",
          dataJson: impactCategory,
        })
        .then(() => undefined);
    }
  };

  const updateImpact = (impactCategoryId: string, impact: HomebrewImpact) => {
    const category = impactCategories[impactCategoryId];
    return updateImpactCategory
      .mutateAsync({
        contentId: impactCategoryId,
        dataJson: {
          ...category,
          contents: {
            ...category.contents,
            [impact.dataswornId]: impact,
          },
        },
      })
      .then(() => undefined);
  };

  if (isLoading) {
    return null;
  }

  const handleCategoryDelete = (categoryId: string) => {
    confirm({
      title: `Delete ${impactCategories[categoryId].label}`,
      description: "Are you sure you want to delete this impact category?",
      confirmationText: "Delete",
      confirmationButtonProps: {
        variant: "contained",
        color: "error",
      },
    })
      .then(() => {
        deleteImpactCategory.mutateAsync(categoryId).catch(ignoreApiError);
      })
      .catch(ignoreApiError);
  };
  const handleImpactDelete = (categoryId: string, impactId: string) => {
    confirm({
      title: `Delete ${impactCategories[categoryId].contents[impactId].label}`,
      description: "Are you sure you want to delete this impact?",
      confirmationText: "Delete",
      confirmationButtonProps: {
        variant: "contained",
        color: "error",
      },
    })
      .then(() => {
        const category = impactCategories[categoryId];
        const contents = { ...category.contents };
        delete contents[impactId];
        updateImpactCategory
          .mutateAsync({
            contentId: categoryId,
            dataJson: { ...category, contents },
          })
          .catch(ignoreApiError);
      })
      .catch(ignoreApiError);
  };

  return (
    <>
      {Object.keys(impactCategories).length === 0 ? (
        <Typography color={"text.secondary"}>
          No Impact Categories Found
        </Typography>
      ) : (
        <Box
          component={"ul"}
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 2,
            pl: 0,
            my: 0,
            listStyle: "none",
          }}
        >
          {Object.keys(impactCategories)
            .sort((c1, c2) =>
              impactCategories[c1].label.localeCompare(
                impactCategories[c2].label
              )
            )
            .map((categoryKey) => (
              <ListItem
                disablePadding
                key={categoryKey}
                sx={{
                  flexDirection: "column",
                  alignItems: "stretch",
                  borderColor: "divider",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderRadius: 1,
                }}
              >
                <Box
                  py={1}
                  px={2}
                  width={"100%"}
                  display={"flex"}
                  alignItems={"center"}
                  sx={{
                    borderBottomColor: "divider",
                    borderBottomWidth: "1px",
                    borderBottomStyle: "solid",
                  }}
                >
                  <ListItemText
                    secondaryTypographyProps={{ component: "span" }}
                    primary={impactCategories[categoryKey].label}
                    secondary={
                      <ClampedMarkdownRenderer
                        markdown={
                          impactCategories[categoryKey].description ?? ""
                        }
                        inheritColor
                      />
                    }
                  />
                  <Box display={"flex"}>
                    {isEditor ? (
                      <>
                        <Tooltip title={"Edit"}>
                          <IconButton
                            onClick={() => {
                              setImpactCategoryDialogOpen(true);
                              setEditingImpactCategoryKey(categoryKey);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={"Delete"}>
                          <IconButton
                            onClick={() => handleCategoryDelete(categoryKey)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <Tooltip title={"Preview"}>
                        <IconButton
                          onClick={() => {
                            setViewingImpactCategoryKey(categoryKey);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
                {isEditor && (
                  <>
                    {Object.keys(impactCategories[categoryKey].contents)
                      .length > 0 ? (
                      <List>
                        {Object.keys(impactCategories[categoryKey].contents)
                          .sort((i1, i2) =>
                            impactCategories[categoryKey].contents[
                              i1
                            ].label.localeCompare(
                              impactCategories[categoryKey].contents[i2].label
                            )
                          )
                          .map((categoryContentKey) => (
                            <ListItem key={categoryContentKey}>
                              <ListItemText
                                secondaryTypographyProps={{ component: "span" }}
                                primary={
                                  impactCategories[categoryKey].contents[
                                    categoryContentKey
                                  ].label
                                }
                                secondary={
                                  <ClampedMarkdownRenderer
                                    markdown={
                                      impactCategories[categoryKey].contents[
                                        categoryContentKey
                                      ].description ?? ""
                                    }
                                    inheritColor
                                  />
                                }
                              />
                              <Box display={"flex"}>
                                <Tooltip title={"Edit"}>
                                  <IconButton
                                    onClick={() => {
                                      setImpactDialogOpen(true);
                                      setEditingImpactCategoryKey(categoryKey);
                                      setEditingImpactKey(categoryContentKey);
                                    }}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={"Delete"}>
                                  <IconButton
                                    onClick={() =>
                                      handleImpactDelete(
                                        categoryKey,
                                        categoryContentKey
                                      )
                                    }
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </ListItem>
                          ))}
                      </List>
                    ) : (
                      <Typography mt={2} px={2} textAlign={"center"}>
                        No Impacts in this Category
                      </Typography>
                    )}
                    <Button
                      color={"inherit"}
                      onClick={() => {
                        setImpactDialogOpen(true);
                        setEditingImpactCategoryKey(categoryKey);
                        setEditingImpactKey(undefined);
                      }}
                      sx={{ alignSelf: "center", my: 1 }}
                    >
                      Add Impact
                    </Button>
                  </>
                )}
              </ListItem>
            ))}
        </Box>
      )}
      {isEditor && (
        <Button
          variant={"outlined"}
          color={"inherit"}
          onClick={() => {
            setImpactCategoryDialogOpen(true);
            setEditingImpactCategoryKey(undefined);
          }}
        >
          Add Impact Category
        </Button>
      )}
      <ImpactCategoryDialog
        homebrewId={homebrewId}
        open={impactCategoryDialogOpen}
        onClose={() => setImpactCategoryDialogOpen(false)}
        impactCategories={impactCategories}
        onSave={createOrUpdateImpactCategory}
        editingCategoryKey={editingImpactCategoryKey}
      />
      {editingImpactCategoryKey && (
        <ImpactDialog
          open={impactDialogOpen}
          onClose={() => setImpactDialogOpen(false)}
          impacts={impactCategories[editingImpactCategoryKey]?.contents}
          onSave={updateImpact}
          editingCategoryKey={editingImpactCategoryKey}
          editingImpactKey={editingImpactKey}
        />
      )}
      {viewingImpactCategoryKey && (
        <ImpactPreviewDialog
          open={!!viewingImpactCategoryKey}
          onClose={() => setViewingImpactCategoryKey(undefined)}
          impactCategory={impactCategories[viewingImpactCategoryKey]}
        />
      )}
    </>
  );
}
