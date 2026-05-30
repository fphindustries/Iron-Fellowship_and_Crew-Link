import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useState } from "react";
import {
  CampaignStarship,
  useDeleteCampaignStarshipMutation,
  useUpsertCampaignStarshipMutation,
} from "hooks/queries/useCampaignsQuery";
import { StarshipProfile } from "./StarshipProfile";
import { StarshipImage } from "./StarshipImage";
import { useConfirm } from "material-ui-confirm";
import { ignoreApiError } from "config/api.config";

export interface StarshipDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  starship: CampaignStarship | null;
}

export function StarshipDialog({
  open,
  onClose,
  campaignId,
  starship,
}: StarshipDialogProps) {
  const upsert = useUpsertCampaignStarshipMutation(campaignId);
  const remove = useDeleteCampaignStarshipMutation(campaignId);
  const confirm = useConfirm();

  const [name, setName] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<string | undefined>(undefined);
  const [quirks, setQuirks] = useState<string[] | undefined>(undefined);

  const displayName = name ?? starship?.name ?? "";
  const displayHistory = history ?? starship?.history ?? "";
  const displayQuirks = quirks ?? starship?.quirks ?? [];

  const handleSave = () => {
    upsert
      .mutateAsync({
        name: displayName || null,
        history: displayHistory || null,
        quirks: displayQuirks,
      })
      .then(() => {
        setName(undefined);
        setHistory(undefined);
        setQuirks(undefined);
        onClose();
      });
  };

  const handleSaveImage = (image: {
    url: string;
    position: { x: number; y: number };
    scale: number;
  }): Promise<void> => upsert.mutateAsync({ image }).then(() => undefined);

  const handleRemove = () => {
    confirm({
      title: "Remove Starship",
      description: "Are you sure you want to remove the starship profile?",
      confirmationText: "Remove",
      confirmationButtonProps: { variant: "contained", color: "error" },
    })
      .then(() => {
        remove.mutateAsync().then(onClose).catch(ignoreApiError);
      })
      .catch(ignoreApiError);
  };

  const handleClose = () => {
    if (upsert.isPending || remove.isPending) return;
    setName(undefined);
    setHistory(undefined);
    setQuirks(undefined);
    onClose();
  };

  const descriptionHint = [displayName, displayHistory, displayQuirks.join(", ")]
    .filter(Boolean)
    .join(". ");

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{starship ? "Edit Starship" : "Add Starship"}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <StarshipProfile
            name={displayName}
            history={displayHistory}
            quirks={displayQuirks}
            onNameChange={setName}
            onHistoryChange={setHistory}
            onQuirksChange={setQuirks}
          />

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            Image
          </Typography>
          <StarshipImage
            starship={starship}
            onSaveImage={handleSaveImage}
            saving={upsert.isPending}
            descriptionHint={descriptionHint}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Box>
          {starship && (
            <Button
              color="error"
              onClick={handleRemove}
              disabled={upsert.isPending || remove.isPending}
            >
              {remove.isPending ? <CircularProgress size={20} /> : "Remove"}
            </Button>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={handleClose} disabled={upsert.isPending || remove.isPending}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleSave}
            loading={upsert.isPending}
          >
            Save
          </LoadingButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
