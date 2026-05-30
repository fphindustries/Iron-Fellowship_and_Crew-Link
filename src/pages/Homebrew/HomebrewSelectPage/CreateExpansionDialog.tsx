import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
} from "@mui/material";
import { DialogTitleWithCloseButton } from "components/shared/DialogTitleWithCloseButton";
import { convertIdPart } from "functions/dataswornIdEncoder";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "stores/store";
import { constructHomebrewEditorPath } from "../routes";
import { ignoreApiError } from "config/api.config";
import { useCreateHomebrewMutation } from "hooks/queries/useHomebrewQuery";

export interface CreateExpansionDialogProps {
  open: boolean;
  onClose: () => void;
  ids: string[];
}

export function CreateExpansionDialog(props: CreateExpansionDialogProps) {
  const { open, onClose, ids } = props;

  const navigate = useNavigate();

  const [collectionName, setCollectionName] = useState("");
  const [error, setError] = useState<string>();

  const uid = useStore((store) => store.auth.uid);
  const createHomebrew = useCreateHomebrewMutation();

  const handleCreate = () => {
    let idSlug: string = "";
    try {
      idSlug = convertIdPart(collectionName);
    } catch (e) {
      console.error(e);
      setError(
        "Failed to convert name to an id. Make sure you have at least three letters in your collection name."
      );
      return;
    }
    if (ids.includes(idSlug)) {
      setError(`ID ${idSlug} is already taken. Please change the package name`);
      return;
    }
    createHomebrew
      .mutateAsync({
        name: collectionName,
        editors: [uid],
      })
      .then((collection) => {
        onClose();
        navigate(constructHomebrewEditorPath(collection.id));
      })
      .catch(ignoreApiError);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitleWithCloseButton onClose={onClose}>
        Create Expansion Collection
      </DialogTitleWithCloseButton>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          sx={{ mt: 1 }}
          label={"Collection Name"}
          value={collectionName}
          onChange={(evt) => setCollectionName(evt.currentTarget.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button color={"inherit"} onClick={onClose}>
          Cancel
        </Button>
        <Button variant={"contained"} onClick={handleCreate}>
          Create Expansion
        </Button>
      </DialogActions>
    </Dialog>
  );
}
