import { Box, Card } from "@mui/material";
import { MovesSection } from "components/features/charactersAndCampaigns/MovesSection";
import { OracleSection } from "components/features/charactersAndCampaigns/OracleSection";
import { AiGuidePanel } from "components/features/aiCopilot/AiCopilotPanel";
import { DarkStyledTabs, DarkStyledTab } from "components/shared/StyledTabs";
import { useCampaignType } from "hooks/useCampaignType";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";
import { useEffect, useState } from "react";
import { useStore } from "stores/store";

enum SIDEBAR_TABS {
  MOVES = "moves",
  ORACLES = "oracles",
  GUIDE = "guide",
}

export function Sidebar() {
  const [currentTab, setCurrentTab] = useState(SIDEBAR_TABS.MOVES);

  const shouldShowOracles = !useCampaignType().showGuidedPlayerView;
  const showAiGuide = useAiGuide();
  const isPanelOpen = useStore((store) => store.ai.isPanelOpen);
  const setIsPanelOpen = useStore((store) => store.ai.setIsPanelOpen);

  useEffect(() => {
    if (isPanelOpen && showAiGuide) {
      setCurrentTab(SIDEBAR_TABS.GUIDE);
      setIsPanelOpen(false);
    }
  }, [isPanelOpen, showAiGuide, setIsPanelOpen]);

  return (
    <>
      <Card
        variant={"outlined"}
        sx={{
          minWidth: 300,
          maxHeight: "100%",
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
        }}
      >
        {(shouldShowOracles || showAiGuide) && (
          <div>
            <DarkStyledTabs
              value={currentTab}
              onChange={(evt, value) => setCurrentTab(value)}
            >
              <DarkStyledTab label={"Moves"} value={SIDEBAR_TABS.MOVES} />
              {shouldShowOracles && (
                <DarkStyledTab label={"Oracles"} value={SIDEBAR_TABS.ORACLES} />
              )}
              {showAiGuide && (
                <DarkStyledTab label={"Guide"} value={SIDEBAR_TABS.GUIDE} />
              )}
            </DarkStyledTabs>
          </div>
        )}
        <Box
          sx={
            currentTab === SIDEBAR_TABS.MOVES
              ? { overflow: "auto", display: "flex", flexDirection: "column" }
              : { display: "none" }
          }
        >
          <MovesSection />
        </Box>
        <Box
          sx={
            shouldShowOracles && currentTab === SIDEBAR_TABS.ORACLES
              ? { overflow: "auto", display: "flex", flexDirection: "column" }
              : { display: "none" }
          }
        >
          <OracleSection />
        </Box>
        {showAiGuide && (
          <Box
            sx={
              currentTab === SIDEBAR_TABS.GUIDE
                ? { overflow: "hidden", display: "flex", flexDirection: "column", flex: 1 }
                : { display: "none" }
            }
          >
            <AiGuidePanel />
          </Box>
        )}
      </Card>
    </>
  );
}
