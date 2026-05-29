import { Box, Button, Card } from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import {
  ContainedTabPanel,
  StyledTab,
  StyledTabs,
} from "components/shared/StyledTabs";
import { useCampaignType } from "hooks/useCampaignType";
import { useGameSystem } from "hooks/useGameSystem";
import { useUpdateQueryStringValueWithoutNavigation } from "hooks/useUpdateQueryStringValueWithoutNavigation";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { CharacterTab, NotesTab, SessionsTab, TracksTab, WorldTab } from "./Tabs";
import { SectorSection } from "components/features/worlds/SectorSection";
import { useStore } from "stores/store";
import { NPCSection } from "components/features/worlds/NPCSection";
import { LoreSection } from "components/features/worlds/Lore";
import { LocationsSection } from "components/features/worlds/Locations";
import { useNewMaps } from "hooks/featureFlags/useNewMaps";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";
import { AiGuidePanel } from "components/features/aiCopilot/AiCopilotPanel";
import { CampaignType } from "types/Campaign.type";
import { SessionPreflightDialog } from "./SessionPreflightDialog";

enum CampaignTabs {
  Characters = "characters",
  Tracks = "tracks",
  Notes = "notes",
  World = "world",
  Locations = "locations",
  Sectors = "sectors",
  NPCs = "ncps",
  Lore = "lore",
  Sessions = "sessions",
  AiGuide = "ai-guide",
}

export interface CampaignContentProps {
  openInviteDialog: () => void;
}

export function CampaignContent(props: CampaignContentProps) {
  const { openInviteDialog } = props;
  const { showGuidedPlayerView, showGuideTips, campaignType } = useCampaignType();
  const isAIGuided = campaignType === CampaignType.AIGuided;

  const showNewLocations = useNewMaps();
  const shouldShowSectors =
    useGameSystem().gameSystem === GAME_SYSTEMS.STARFORGED && !showNewLocations;

  const [searchParams] = useSearchParams();
  const [selectedTab, setSelectedTab] = useState<CampaignTabs>(
    (searchParams.get("tab") as CampaignTabs) ?? CampaignTabs.Characters
  );
  useUpdateQueryStringValueWithoutNavigation("tab", selectedTab);
  const handleTabChange = (tab: CampaignTabs) => {
    setSelectedTab(tab);
  };

  const hasWorld = useStore(
    (store) => !!store.campaigns.currentCampaign.currentCampaign?.worldId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId ?? ""
  );
  const showAiGuide = useAiGuide();
  const [preflightOpen, setPreflightOpen] = useState(false);

  return (
    <Card
      variant={"outlined"}
      sx={{
        borderWidth: { xs: 0, md: 1 },
        borderTopWidth: { xs: 1 },
        mx: { xs: -2, sm: -3, md: 0 },
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <StyledTabs
        value={selectedTab}
        onChange={(evt, value) => handleTabChange(value)}
        sx={(theme) => ({
          borderTopRightRadius: theme.shape.borderRadius,
          borderTopLeftRadius: theme.shape.borderRadius,
        })}
      >
        <StyledTab label="Characters" value={CampaignTabs.Characters} />
        <StyledTab label="Tracks" value={CampaignTabs.Tracks} />
        {!showGuidedPlayerView && (
          <StyledTab label="Notes" value={CampaignTabs.Notes} />
        )}
        <StyledTab label="World" value={CampaignTabs.World} />
        {shouldShowSectors ? (
          <StyledTab label="Sectors" value={CampaignTabs.Sectors} />
        ) : (
          <StyledTab label="Locations" value={CampaignTabs.Locations} />
        )}
        <StyledTab label="NPCs" value={CampaignTabs.NPCs} />
        <StyledTab label="Lore" value={CampaignTabs.Lore} />
        <StyledTab label="Sessions" value={CampaignTabs.Sessions} />
        {showAiGuide && !isAIGuided && (
          <StyledTab label="AI" value={CampaignTabs.AiGuide} />
        )}
        {isAIGuided && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              ml: "auto",
              pr: 1,
              flexShrink: 0,
            }}
          >
            <Button
              onClick={() => setPreflightOpen(true)}
              size="small"
              variant="contained"
              startIcon={<RocketLaunchIcon sx={{ fontSize: 16 }} />}
              sx={{ fontSize: 12, py: 0.5 }}
            >
              Play
            </Button>
          </Box>
        )}
      </StyledTabs>
      <ContainedTabPanel isVisible={selectedTab === CampaignTabs.Characters}>
        <CharacterTab openInviteDialog={openInviteDialog} />
      </ContainedTabPanel>
      <ContainedTabPanel isVisible={selectedTab === CampaignTabs.Tracks}>
        <TracksTab />
      </ContainedTabPanel>
      <ContainedTabPanel isVisible={selectedTab === CampaignTabs.Notes}>
        <NotesTab />
      </ContainedTabPanel>
      <ContainedTabPanel isVisible={selectedTab === CampaignTabs.World}>
        <WorldTab />
      </ContainedTabPanel>
      <ContainedTabPanel
        isVisible={selectedTab === CampaignTabs.Sectors}
        greyBackground={hasWorld}
      >
        <SectorSection
          showHiddenTag={showGuideTips}
          openNPCTab={() => setSelectedTab(CampaignTabs.NPCs)}
        />
      </ContainedTabPanel>
      {!shouldShowSectors && (
        <ContainedTabPanel
          isVisible={selectedTab === CampaignTabs.Locations}
          greyBackground={hasWorld}
        >
          <LocationsSection
            showHiddenTag
            openNPCTab={() => setSelectedTab(CampaignTabs.NPCs)}
          />
        </ContainedTabPanel>
      )}
      <ContainedTabPanel
        isVisible={selectedTab === CampaignTabs.NPCs}
        greyBackground={hasWorld}
      >
        <NPCSection showHiddenTag={showGuideTips} />
      </ContainedTabPanel>
      <ContainedTabPanel
        isVisible={selectedTab === CampaignTabs.Lore}
        greyBackground={hasWorld}
      >
        <LoreSection showHiddenTag={showGuideTips} />
      </ContainedTabPanel>
      <ContainedTabPanel isVisible={selectedTab === CampaignTabs.Sessions}>
        <SessionsTab />
      </ContainedTabPanel>
      {showAiGuide && !isAIGuided && (
        <ContainedTabPanel isVisible={selectedTab === CampaignTabs.AiGuide}>
          <AiGuidePanel />
        </ContainedTabPanel>
      )}
      <SessionPreflightDialog
        open={preflightOpen}
        campaignId={campaignId}
        onClose={() => setPreflightOpen(false)}
      />
    </Card>
  );
}
