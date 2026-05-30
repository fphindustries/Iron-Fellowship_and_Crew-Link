import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  ListItemText,
  TextField,
} from "@mui/material";
import { DialogTitleWithCloseButton } from "components/shared/DialogTitleWithCloseButton";
import { useState } from "react";
import { useStore } from "stores/store";
import { HomebrewOracleCollectionDocument } from "types/homebrew/HomebrewOracleCollection.type";
import { ignoreApiError } from "config/api.config";
import { useUpdateHomebrewContentMutation } from "hooks/queries/useHomebrewQuery";

export interface MoveOracleTableDialogProps {
  open: boolean;
  oracleId: string;
  oracleCollectionId: string;
  oracleCollections: Record<string, HomebrewOracleCollectionDocument>;
  onClose: () => void;
}

export function MoveOracleTableDialog(props: MoveOracleTableDialogProps) {
  const { open, oracleId, oracleCollectionId, onClose, oracleCollections } =
    props;

  const [collectionId, setCollectionId] = useState<string | undefined>(
    oracleCollectionId
  );

  const oracle = useStore((store) =>
    Object.values(store.homebrew.collections).find(
      (collection) => !!collection.oracleTables?.data?.[oracleId]
    )?.oracleTables?.data?.[oracleId]
  );
  const updateContent = useUpdateHomebrewContentMutation(oracle?.collectionId);
  const handleMove = () => {
    if (oracle && collectionId) {
      updateContent
        .mutateAsync({
          contentId: oracleId,
          dataJson: { ...oracle, oracleCollectionId: collectionId },
        })
        .then(() => {
          onClose();
        })
        .catch(ignoreApiError);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth={"xs"} fullWidth>
      <DialogTitleWithCloseButton onClose={onClose}>
        Move Oracle Table
      </DialogTitleWithCloseButton>
      <DialogContent>
        <Autocomplete
          sx={{ mt: 1 }}
          options={Object.keys(oracleCollections)}
          getOptionKey={(option) => option}
          getOptionLabel={(key) => oracleCollections[key]?.label}
          renderInput={(params) => (
            <TextField {...params} label={"Oracle Collections"} />
          )}
          renderOption={(props, option) => (
            <Box component={"li"} {...props}>
              <ListItemText primary={oracleCollections[option].label} />
            </Box>
          )}
          value={collectionId ?? null}
          onChange={(evt, value) => {
            setCollectionId(value ?? undefined);
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button color={"inherit"} onClick={onClose}>
          Cancel
        </Button>
        <Button variant={"contained"} onClick={handleMove}>
          Move Oracle
        </Button>
      </DialogActions>
    </Dialog>
  );
}
