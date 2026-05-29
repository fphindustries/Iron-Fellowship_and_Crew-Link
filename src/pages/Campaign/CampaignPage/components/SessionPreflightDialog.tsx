import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { useNavigate } from "react-router-dom";
import { useStore } from "stores/store";
import { useCampaignStarshipQuery } from "hooks/queries/useCampaignsQuery";
import { constructCampaignSheetPath, CAMPAIGN_ROUTES } from "pages/Campaign/routes";
import { useGameSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";

interface Check {
  label: string;
  passed: boolean;
  hint: string;
}

interface SessionPreflightDialogProps {
  open: boolean;
  campaignId: string;
  onClose: () => void;
}

export function SessionPreflightDialog(props: SessionPreflightDialogProps) {
  const { open, campaignId, onClose } = props;
  const navigate = useNavigate();
  const { gameSystem } = useGameSystem();

  const hasCharacter = useStore(
    (store) =>
      Object.keys(store.campaigns.currentCampaign.characters.characterMap).length > 0
  );
  const hasWorld = useStore(
    (store) => !!store.campaigns.currentCampaign.currentCampaign?.worldId
  );
  const hasSectors = useStore(
    (store) =>
      Object.keys(store.worlds.currentWorld.currentWorldSectors.sectors).length > 0
  );
  const hasLocations = useStore(
    (store) =>
      Object.keys(store.worlds.currentWorld.currentWorldLocations.locationMap).length > 0
  );

  const { data: starship } = useCampaignStarshipQuery(campaignId);
  const hasShip = !!starship;

  const locationPassed =
    gameSystem === GAME_SYSTEMS.STARFORGED ? hasSectors : hasLocations;

  const checks: Check[] = [
    {
      label: "Character",
      passed: hasCharacter,
      hint: "Add a character on the Characters tab.",
    },
    {
      label: "Starship",
      passed: hasShip,
      hint: "Add a starship on the Characters tab.",
    },
    {
      label: "World",
      passed: hasWorld,
      hint: "Link a world on the World tab.",
    },
    {
      label: gameSystem === GAME_SYSTEMS.STARFORGED ? "Sector" : "Location",
      passed: locationPassed,
      hint:
        gameSystem === GAME_SYSTEMS.STARFORGED
          ? "Add a sector on the Sectors tab."
          : "Add a location on the Locations tab.",
    },
  ];

  const allPassed = checks.every((c) => c.passed);

  function handleStart() {
    onClose();
    navigate(constructCampaignSheetPath(campaignId, CAMPAIGN_ROUTES.PLAY));
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Ready to Play?</DialogTitle>
      <DialogContent>
        <List dense disablePadding>
          {checks.map((check) => (
            <ListItem key={check.label} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {check.passed ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : (
                  <ErrorIcon color="error" fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={check.label}
                secondary={!check.passed ? check.hint : undefined}
                primaryTypographyProps={{ variant: "body2" }}
                secondaryTypographyProps={{ variant: "caption" }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleStart}
          variant="contained"
          disabled={!allPassed}
        >
          Start Session
        </Button>
      </DialogActions>
    </Dialog>
  );
}
