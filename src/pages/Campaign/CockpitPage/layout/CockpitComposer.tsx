import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { MouseEvent, useState, useCallback } from "react";
import { useStore } from "stores/store";
import { SuggestedAction, ActionSuggestionsOutput } from "types/AI.type";
import { useCockpitAiRequest } from "../shared/useCockpitAiRequest";
import { GuidedMoveModal } from "../moves/GuidedMoveModal";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { useActiveCombatQuery } from "hooks/queries/useCombatQuery";

interface PaletteGroup {
  label: string;
  actions: SuggestedAction[];
}

const ADVENTURE_ACTIONS: SuggestedAction[] = [
  paletteAction("Face Danger", "Face danger", "risky", "Act despite danger or pressure"),
  paletteAction("Secure an Advantage", "Secure an advantage", "investigative", "Prepare, gain leverage, or improve your position"),
  paletteAction("Gather Information", "Gather information", "investigative", "Investigate, ask questions, or study a situation"),
  paletteAction("Compel", "Compel", "social", "Persuade, threaten, bargain, or negotiate"),
  paletteAction("Check Your Gear", "Check your gear", "investigative", "See if you have the right item or resource"),
  paletteAction("Aid Your Ally", "Aid an ally", "social", "Help another protagonist with their action"),
];

const START_COMBAT_ACTIONS: SuggestedAction[] = [
  paletteAction("Enter the Fray", "Enter the fray", "risky", "Start a combat objective"),
];

const COMBAT_ACTIONS: SuggestedAction[] = [
  paletteAction("Gain Ground", "Gain ground", "risky", "Reinforce your position or move toward an objective"),
  paletteAction("Strike", "Strike", "risky", "Attack while in control"),
  paletteAction("React Under Fire", "React under fire", "risky", "Avoid danger or overcome an obstacle in a bad spot"),
  paletteAction("Clash", "Clash", "risky", "Fight back while in a bad spot"),
];

const EXPLORATION_ACTIONS: SuggestedAction[] = [
  paletteAction("Set a Course", "Set a course", "investigative", "Travel through known perilous space"),
  paletteAction("Explore a Waypoint", "Explore a waypoint", "investigative", "Examine a notable location"),
  paletteAction("Confront Chaos", "Confront chaos", "risky", "Face a dire chaotic manifestation"),
];

const ACTIVE_EXPEDITION_ACTIONS: SuggestedAction[] = [
  paletteAction("Undertake an Expedition", "Undertake an expedition", "investigative", "Make progress on a perilous journey"),
  paletteAction("Finish an Expedition", "Finish an expedition", "investigative", "Resolve an expedition progress track"),
  ...EXPLORATION_ACTIONS,
];

function paletteAction(
  moveName: string,
  label: string,
  intentCategory: SuggestedAction["intentCategory"],
  reason: string
): SuggestedAction {
  return {
    label,
    intentCategory,
    moveName,
    stat: null,
    confidence: "high",
    reason,
  };
}

export function CockpitComposer() {
  const isRequesting = useStore((store) => store.ai.isRequesting);
  const { request } = useCockpitAiRequest();
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const npcCount = useStore(
    (store) => Object.keys(store.aiGuide.state?.npcIntents ?? {}).length
  );
  const activeJourneyCount = useStore(
    (store) =>
      Object.keys(
        store.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active]?.[
          TrackTypes.Journey
        ] ?? {}
      ).length
  );
  const { data: activeCombat } = useActiveCombatQuery({
    campaignId: campaignId ?? undefined,
  });

  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalIntent, setModalIntent] = useState("");
  const [modalMoveName, setModalMoveName] = useState<string | null>(null);
  const [paletteAnchor, setPaletteAnchor] = useState<HTMLElement | null>(null);
  const [activePaletteGroup, setActivePaletteGroup] = useState<PaletteGroup | null>(null);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);

  const handleGetSuggestions = useCallback(async () => {
    setGuideDialogOpen(true);
    setLoadingSuggestions(true);
    try {
      const result = await request("actionSuggestions");
      if (result?.structuredData) {
        const data = result.structuredData as unknown as ActionSuggestionsOutput;
        setSuggestions(data.suggestions ?? []);
        setGuideDialogOpen(true);
      }
    } finally {
      setLoadingSuggestions(false);
    }
  }, [request]);

  const handleOpenPalette = (
    event: MouseEvent<HTMLElement>,
    group: PaletteGroup
  ) => {
    setPaletteAnchor(event.currentTarget);
    setActivePaletteGroup(group);
  };

  const handleClosePalette = () => {
    setPaletteAnchor(null);
  };

  const handleSelectSuggestion = (
    action: SuggestedAction,
    initialIntent = action.label
  ) => {
    setModalIntent(initialIntent);
    setModalMoveName(action.moveName ?? null);
    setModalOpen(true);
    handleClosePalette();
    setGuideDialogOpen(false);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const handleModalComplete = () => {
    setModalOpen(false);
    setSuggestions([]);
  };

  const paletteGroups: PaletteGroup[] = [
    { label: "Adventure", actions: ADVENTURE_ACTIONS },
    {
      label: "Combat",
      actions: activeCombat ? COMBAT_ACTIONS : START_COMBAT_ACTIONS,
    },
    {
      label: "Exploration",
      actions: activeJourneyCount > 0
        ? ACTIVE_EXPEDITION_ACTIONS
        : EXPLORATION_ACTIONS,
    },
    ...(npcCount > 0
      ? [{
          label: "Connection",
          actions: [
            paletteAction("Compel", "Compel", "social", "Negotiate, persuade, intimidate, or bargain"),
            paletteAction("Gather Information", "Ask questions", "social", "Learn what someone knows"),
            paletteAction("Secure an Advantage", "Read the room", "social", "Assess an interaction or gain leverage"),
          ],
        }]
      : []),
  ];

  return (
    <Box>
      <Divider />
      <Box
        sx={{
          p: 1.5,
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">
            Moves
          </Typography>
          {paletteGroups.map((group) => (
            <Button
              key={group.label}
              size="small"
              variant={
                activePaletteGroup?.label === group.label && paletteAnchor
                  ? "contained"
                  : "outlined"
              }
              color="inherit"
              disabled={isRequesting}
              onClick={(event) => handleOpenPalette(event, group)}
              sx={{ fontSize: 11, py: 0.25, px: 1 }}
            >
              {group.label}
            </Button>
          ))}
          <Button
            size="small"
            color="inherit"
            startIcon={
              loadingSuggestions ? (
                <CircularProgress size={12} />
              ) : (
                <RefreshIcon sx={{ fontSize: 14 }} />
              )
            }
            disabled={loadingSuggestions || isRequesting}
            onClick={handleGetSuggestions}
            sx={{ opacity: 0.7, fontSize: 11 }}
          >
            {suggestions.length > 0 ? "Ask Guide Again" : "Ask Guide"}
          </Button>
        </Stack>
      </Box>
      <Popover
        open={Boolean(paletteAnchor && activePaletteGroup)}
        anchorEl={paletteAnchor}
        onClose={handleClosePalette}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{ sx: { width: 280, maxWidth: "calc(100vw - 24px)" } }}
      >
        <Box sx={{ py: 0.75 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", px: 1.5, pb: 0.5 }}
          >
            {activePaletteGroup?.label}
          </Typography>
          <List dense disablePadding>
            {(activePaletteGroup?.actions ?? []).map((action) => (
              <ListItemButton
                key={`${activePaletteGroup?.label}-${action.label}-${action.moveName}`}
                onClick={() =>
                  handleSelectSuggestion(
                    action,
                    activePaletteGroup?.label === "Guide" ? action.label : ""
                  )
                }
              >
                <ListItemText
                  primary={action.label}
                  secondary={
                    action.moveName
                      ? `${action.moveName}${action.stat ? ` +${action.stat}` : ""} - ${action.reason}`
                      : action.reason
                  }
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Popover>
      <Dialog
        open={guideDialogOpen}
        onClose={() => setGuideDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Guide Recommendations</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {loadingSuggestions ? (
            <Box display="flex" alignItems="center" gap={1} p={2}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Asking the Guide...
              </Typography>
            </Box>
          ) : suggestions.length === 0 ? (
            <Box p={2}>
              <Typography variant="body2" color="text.secondary">
                No recommendations returned. Try again or choose a move from the palette.
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {suggestions.map((action) => (
                <ListItemButton
                  key={`guide-${action.label}-${action.moveName}`}
                  onClick={() => handleSelectSuggestion(action, action.label)}
                >
                  <ListItemText
                    primary={action.label}
                    secondary={
                      action.moveName
                        ? `${action.moveName}${action.stat ? ` +${action.stat}` : ""} - ${action.reason}`
                        : action.reason
                    }
                    primaryTypographyProps={{ variant: "body2" }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
      <GuidedMoveModal
        open={modalOpen}
        onClose={handleModalClose}
        onComplete={handleModalComplete}
        intent={modalIntent}
        moveName={modalMoveName}
      />
    </Box>
  );
}
