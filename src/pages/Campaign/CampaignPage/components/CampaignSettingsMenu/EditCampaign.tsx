import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  Typography,
} from "@mui/material";
import { CampaignTypeChooser } from "components/features/campaigns/CampaignTypeChooser";
import { DialogTitleWithCloseButton } from "components/shared/DialogTitleWithCloseButton";
import { useCampaignType } from "hooks/useCampaignType";
import { useEffect, useState } from "react";
import { useStore } from "stores/store";
import { ignoreApiError } from "config/api.config";
import { useUpdateCampaignMutation } from "hooks/queries/useCampaignsQuery";

export interface EditCampaignProps {
  open: boolean;
  onClose: () => void;
}

export function EditCampaign(props: EditCampaignProps) {
  const { open, onClose } = props;

  const campaignName = useStore(
    (store) =>
      store.campaigns.currentCampaign.currentCampaign?.name ??
      "Unnamed Campaign"
  );
  const { campaignType } = useCampaignType();

  const [newName, setNewName] = useState(campaignName);
  const [newType, setNewType] = useState(campaignType);

  useEffect(() => {
    setNewName(campaignName);
  }, [campaignName]);
  useEffect(() => {
    setNewType(campaignType);
  }, [campaignType]);

  const [isLoading, setIsLoading] = useState(false);

  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const updateCampaign = useUpdateCampaignMutation(campaignId ?? "");

  const handleSave = () => {
    if (!campaignId) return;
    setIsLoading(true);
    updateCampaign
      .mutateAsync({
        name: newName,
        type: newType,
      })
      .catch(ignoreApiError)
      .finally(() => {
        setIsLoading(false);
        onClose();
      });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitleWithCloseButton onClose={onClose}>
        Edit Campaign
      </DialogTitleWithCloseButton>
      <DialogContent>
        <TextField
          label={"Campaign Name"}
          value={newName}
          onChange={(evt) => setNewName(evt.target.value)}
          sx={{ mt: 1 }}
        />
        <Typography variant={"subtitle1"} sx={{ mt: 2, mb: 1 }}>
          Campaign Type
        </Typography>
        <CampaignTypeChooser
          type={newType}
          onChange={(newTypeValue) => setNewType(newTypeValue)}
        />
      </DialogContent>
      <DialogActions>
        <Button color={"inherit"} onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant={"contained"}
          onClick={() => handleSave()}
          disabled={isLoading}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
