import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "providers/SnackbarProvider/useSnackbar";
import { updateUser } from "lib/auth.lib";
import { useEffect, useState } from "react";
import { useStore } from "stores/store";
import { UserAvatar } from "./UserAvatar";
import { UserDocument } from "api-calls/user/_user.type";
import { DialogTitleWithCloseButton } from "./DialogTitleWithCloseButton";

export interface UserNameDialogProps {
  open: boolean;
  updating?: boolean;
  handleClose: () => void;
}

export function UserNameDialog(props: UserNameDialogProps) {
  const { open, updating, handleClose } = props;
  const { error } = useSnackbar();

  const user = useStore((store) => store.auth.user);
  const hasHiddenPhotoUrl = useStore((store) =>
    user?.id ? store.users.userMap[user.id]?.doc?.hidePhoto ?? false : false
  );

  const [name, setName] = useState(user?.user_metadata?.full_name ?? user?.email ?? "");
  const [showProfileImage, setShowProfileImage] = useState(!hasHiddenPhotoUrl);

  useEffect(() => {
    setShowProfileImage(!hasHiddenPhotoUrl);
  }, [hasHiddenPhotoUrl]);

  const [isLoading, setIsLoading] = useState(false);

  const handleSave = () => {
    if (name.trim().length > 0) {
      const newUserDoc: UserDocument = {
        displayName: name,
        hidePhoto: !showProfileImage,
      };
      const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
      if (avatarUrl) {
        newUserDoc.photoURL = avatarUrl;
      }

      setIsLoading(true);
      updateUser(newUserDoc)
        .then(() => {
          location.reload();
          handleClose();
        })
        .catch((e) => {
          console.error(e);
          error("Failed to update name");
          handleClose();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      error("Name is required.");
    }
  };

  return (
    <Dialog open={open} onClose={updating ? handleClose : () => {}}>
      {updating ? (
        <DialogTitleWithCloseButton onClose={handleClose}>
          Change Username
        </DialogTitleWithCloseButton>
      ) : (
        <DialogTitle>We did not catch your name</DialogTitle>
      )}
      <DialogContent>
        <Stack spacing={2}>
          <Typography>
            Usernames will be displayed to other players in campaigns.
          </Typography>
          <TextField
            label={"Username"}
            value={name}
            onChange={(evt) => setName(evt.currentTarget.value)}
            sx={{ mt: 4 }}
          />
          {(user?.user_metadata?.avatar_url as string | undefined) && (
            <Stack direction={"row"} spacing={1}>
              <UserAvatar
                uid={user?.id ?? ""}
                forceShowPhoto={showProfileImage}
                forceName={name}
              />
              <FormControlLabel
                label={"Show Profile Image"}
                control={
                  <Checkbox
                    checked={showProfileImage}
                    onChange={(evt, checked) => setShowProfileImage(checked)}
                  />
                }
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {updating && (
          <Button onClick={handleClose} color={"inherit"}>
            Cancel
          </Button>
        )}
        <LoadingButton
          loading={isLoading}
          variant={"contained"}
          color={"primary"}
          onClick={() => handleSave()}
        >
          Set Name
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
