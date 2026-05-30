import { Box, ButtonGroup, Button } from "@mui/material";
import { useStore } from "stores/store";
import { FocusMode } from "types/AIGuideState.type";
import { CurrentScenePanel } from "../scene/CurrentScenePanel";
import { CockpitComposer } from "./CockpitComposer";
import { CombatFocusMode } from "../focus/CombatFocusMode";
import { ExpeditionFocusMode } from "../focus/ExpeditionFocusMode";
import { SocialFocusMode } from "../focus/SocialFocusMode";

const FOCUS_MODES: { mode: FocusMode; label: string }[] = [
  { mode: "standard", label: "Scene" },
  { mode: "combat", label: "Combat" },
  { mode: "expedition", label: "Journey" },
  { mode: "social", label: "Social" },
];

export function CockpitCenter() {
  const focusMode = useStore(
    (store) => store.aiGuide.state?.focusMode ?? "standard"
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const setFocusMode = useStore((store) => store.aiGuide.setFocusMode);

  const handleFocusChange = (mode: FocusMode) => {
    if (!campaignId) return;
    setFocusMode(campaignId, mode);
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Focus mode switcher */}
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        <ButtonGroup size="small" variant="outlined" color="inherit">
          {FOCUS_MODES.map(({ mode, label }) => (
            <Button
              key={mode}
              onClick={() => handleFocusChange(mode)}
              variant={focusMode === mode ? "contained" : "outlined"}
              color={
                mode === "combat"
                  ? "error"
                  : mode === "expedition"
                  ? "primary"
                  : mode === "social"
                  ? "secondary"
                  : "inherit"
              }
              sx={{
                fontSize: 11,
                py: 0.4,
                opacity: focusMode === mode ? 1 : 0.6,
              }}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* Main content area */}
      <Box flex={1} overflow="auto">
        {focusMode === "standard" && <CurrentScenePanel />}
        {focusMode === "combat" && <CombatFocusMode />}
        {focusMode === "expedition" && <ExpeditionFocusMode />}
        {focusMode === "social" && <SocialFocusMode />}
      </Box>

      <CockpitComposer />
    </Box>
  );
}
