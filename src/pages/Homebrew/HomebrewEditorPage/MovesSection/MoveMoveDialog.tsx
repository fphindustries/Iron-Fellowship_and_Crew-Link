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
import { HomebrewMoveCategoryDocument } from "types/homebrew/HomebrewMoveCategory.type";
import { ignoreApiError } from "config/api.config";
import { useUpdateHomebrewContentMutation } from "hooks/queries/useHomebrewQuery";
import { useStore } from "stores/store";

export interface MoveMoveDialogProps {
  open: boolean;
  moveId: string;
  moveCategoryId: string;
  categories: Record<string, HomebrewMoveCategoryDocument>;
  onClose: () => void;
}

export function MoveMoveDialog(props: MoveMoveDialogProps) {
  const { open, moveId, moveCategoryId, categories, onClose } = props;

  const [categoryId, setCategoryId] = useState<string | undefined>(
    moveCategoryId
  );

  const move = useStore((store) => {
    const collection = Object.values(store.homebrew.collections).find(
      (collection) => !!collection.moves?.data?.[moveId]
    );
    return collection?.moves?.data?.[moveId];
  });
  const updateMove = useUpdateHomebrewContentMutation(move?.collectionId);
  const handleMove = () => {
    if (categoryId && move) {
      updateMove
        .mutateAsync({
          contentId: moveId,
          dataJson: { ...move, categoryId },
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
        Move Move
      </DialogTitleWithCloseButton>
      <DialogContent>
        <Autocomplete
          sx={{ mt: 1 }}
          options={Object.keys(categories)}
          getOptionKey={(option) => option}
          getOptionLabel={(key) => categories[key]?.label}
          renderInput={(params) => (
            <TextField {...params} label={"Move Categories"} />
          )}
          renderOption={(props, option) => (
            <Box component={"li"} {...props}>
              <ListItemText primary={categories[option].label} />
            </Box>
          )}
          value={categoryId ?? null}
          onChange={(evt, value) => {
            setCategoryId(value ?? undefined);
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button color={"inherit"} onClick={onClose}>
          Cancel
        </Button>
        <Button variant={"contained"} onClick={handleMove}>
          Move Move
        </Button>
      </DialogActions>
    </Dialog>
  );
}
