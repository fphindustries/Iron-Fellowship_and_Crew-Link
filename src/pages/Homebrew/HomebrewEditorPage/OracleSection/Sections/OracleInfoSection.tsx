import { LoadingButton } from "@mui/lab";
import { Box, Button } from "@mui/material";
import { MarkdownRenderer } from "components/shared/MarkdownRenderer";
import { SectionHeading } from "components/shared/SectionHeading";
import { useConfirm } from "material-ui-confirm";
import { useState } from "react";
import { useStore } from "stores/store";
import { HomebrewOracleCollectionDocument } from "types/homebrew/HomebrewOracleCollection.type";
import { MoveOracleCollectionDialog } from "./OracleCollectionsSection/MoveOracleCollectionDialog";
import { ignoreApiError } from "config/api.config";
import { useDeleteHomebrewContentMutation } from "hooks/queries/useHomebrewQuery";

export interface OracleInfoSectionProps {
  homebrewId: string;
  oracleCollectionId: string;
  oracleCollection: HomebrewOracleCollectionDocument;
  oracleCollections: Record<string, HomebrewOracleCollectionDocument>;
  openCollectionDialog: () => void;
  closeCurrentOracleCollection: () => void;
  isEditor: boolean;
}

export function OracleInfoSection(props: OracleInfoSectionProps) {
  const {
    homebrewId,
    oracleCollectionId,
    oracleCollection,
    oracleCollections,
    openCollectionDialog,
    closeCurrentOracleCollection,
    isEditor,
  } = props;

  const oracleTables = useStore(
    (store) => store.homebrew.collections[homebrewId]?.oracleTables?.data ?? {}
  );
  const deleteContent = useDeleteHomebrewContentMutation(homebrewId);

  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const confirm = useConfirm();
  const handleDelete = () => {
    confirm({
      title: `Delete ${oracleCollection.label}`,
      description:
        "Are you sure you want to delete this oracle collection? This will also delete the oracles and collections under this category. This cannot be undone.",
      confirmationText: "Delete",
      confirmationButtonProps: {
        variant: "contained",
        color: "error",
      },
    })
      .then(() => {
        setIsDeleteLoading(true);
        deleteOracleCollectionContent(oracleCollectionId)
          .then(() => {
            closeCurrentOracleCollection();
          })
          .catch(ignoreApiError)
          .finally(() => {
            setIsDeleteLoading(false);
          });
      })
      .catch(ignoreApiError);
  };

  const deleteOracleCollectionContent = async (collectionId: string) => {
    const childTableIds = Object.keys(oracleTables).filter(
      (tableId) => oracleTables[tableId].oracleCollectionId === collectionId
    );
    const childCollectionIds = Object.keys(oracleCollections).filter(
      (childCollectionId) =>
        oracleCollections[childCollectionId].parentOracleCollectionId ===
        collectionId
    );

    await Promise.all([
      ...childTableIds.map((tableId) => deleteContent.mutateAsync(tableId)),
      ...childCollectionIds.map((childCollectionId) =>
        deleteOracleCollectionContent(childCollectionId)
      ),
    ]);
    await deleteContent.mutateAsync(collectionId);
  };

  const [moveCollectionDialogOpen, setMoveCollectionDialogOpen] =
    useState(false);

  return (
    <>
      <SectionHeading
        label={oracleCollection.label}
        action={
          isEditor && (
            <>
              <LoadingButton
                color={"error"}
                onClick={handleDelete}
                loading={isDeleteLoading}
              >
                Delete Collection
              </LoadingButton>
              <Button
                color={"inherit"}
                onClick={() => setMoveCollectionDialogOpen(true)}
              >
                Move Collection
              </Button>
              <Button
                color={"inherit"}
                variant={"outlined"}
                onClick={openCollectionDialog}
              >
                Edit Collection
              </Button>
            </>
          )
        }
        floating
      />
      {oracleCollection.description ? (
        <Box px={2}>
          <MarkdownRenderer markdown={oracleCollection.description} />
        </Box>
      ) : null}
      <MoveOracleCollectionDialog
        open={moveCollectionDialogOpen}
        onClose={() => setMoveCollectionDialogOpen(false)}
        oracleCollectionId={oracleCollectionId}
        oracleCollections={oracleCollections}
        parentOracleCollectionId={oracleCollection.parentOracleCollectionId}
      />
    </>
  );
}
