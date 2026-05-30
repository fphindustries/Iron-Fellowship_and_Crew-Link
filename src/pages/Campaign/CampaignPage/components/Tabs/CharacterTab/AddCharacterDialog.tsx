import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { CharacterList } from "components/features/characters/CharacterList";
import { Link } from "react-router-dom";
import { constructCharacterCreateInCampaignUrl, constructCharacterGuidedCreateInCampaignUrl } from "pages/Character/routes";
import { useStore } from "stores/store";
import { useState } from "react";
import { useUpdateCampaignCharacterMutation } from "hooks/queries/useCampaignsQuery";

export interface AddCharacterDialogProps {
  open: boolean;
  handleClose: () => void;
  campaignId: string;
}

export function AddCharacterDialog(props: AddCharacterDialogProps) {
  const { open, handleClose, campaignId } = props;

  const characters = useStore((store) => store.characters.characterMap);
  const isLoading = useStore((store) => store.characters.loading);
  const uid = useStore((store) => store.auth.uid);

  const addCharacterToCampaign = useUpdateCampaignCharacterMutation(campaignId);
  const [addCharacterLoading, setAddCharacterLoading] = useState(false);

  const addCharacter = (characterId: string) => {
    setAddCharacterLoading(true);
    addCharacterToCampaign
      .mutateAsync({ characterId, userId: uid })
      .finally(() => {
        setAddCharacterLoading(false);
        handleClose();
      });
  };

  return (
    <Dialog open={open} onClose={() => handleClose()}>
      <DialogTitle
        display={"flex"}
        justifyContent={"space-between"}
        alignItems={"center"}
      >
        <span>Add Character</span>
        <IconButton
          onClick={() => handleClose()}
          disabled={addCharacterLoading}
          sx={{ ml: 2 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {Object.keys(characters).length > 0 && (
          <Typography
            sx={{ mb: 1 }}
            color={(theme) => theme.palette.text.secondary}
          >
            Add an existing character
          </Typography>
        )}
        {!isLoading && (
          <CharacterList
            characters={characters}
            maxColumns={1}
            actions={(characterId) => (
              <Button
                disabled={
                  !!characters[characterId].campaignId || addCharacterLoading
                }
                onClick={() => addCharacter(characterId)}
              >
                {characters[characterId].campaignId ? "Selected" : "Select"}
              </Button>
            )}
          />
        )}
        {Object.keys(characters).length > 0 && (
          <Divider sx={{ my: 3 }}>OR</Divider>
        )}
        <Box
          display={"flex"}
          alignItems={"center"}
          justifyContent={"center"}
          mt={2}
        >
          <Button
            variant={"contained"}
            component={Link}
            to={constructCharacterGuidedCreateInCampaignUrl(campaignId)}
            disabled={addCharacterLoading}
          >
            Guided Character Creation
          </Button>
        </Box>        
        <Box
          display={"flex"}
          alignItems={"center"}
          justifyContent={"center"}
          mt={2}
        >
          <Button
            variant={"contained"}
            component={Link}
            to={constructCharacterCreateInCampaignUrl(campaignId)}
            disabled={addCharacterLoading}
          >
            Create New Character
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
