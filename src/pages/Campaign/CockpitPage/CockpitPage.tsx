import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, LinearProgress } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useStore } from "stores/store";
import { useCampaignQuery } from "hooks/queries/useCampaignsQuery";
import { PageContent, PageHeader } from "components/shared/Layout";
import { EmptyState } from "components/shared/EmptyState";
import { LinkComponent } from "components/shared/LinkComponent";
import { Head } from "providers/HeadProvider/Head";
import { CampaignType } from "types/Campaign.type";
import { CAMPAIGN_ROUTES, constructCampaignPath, constructCampaignSheetPath } from "../routes";
import { CockpitTopBar } from "./layout/CockpitTopBar";
import { CockpitLeftRail } from "./layout/CockpitLeftRail";
import { CockpitCenter } from "./layout/CockpitCenter";
import { CockpitRightRail } from "./layout/CockpitRightRail";
import { AskGuideDrawer } from "./guide/AskGuideDrawer";
import { SessionHistoryDrawer } from "./history/SessionHistoryDrawer";
import { CockpitContext, EntityRef } from "./shared/CockpitContext";
import { EntityDrawer } from "./shared/EntityDrawer";
import { useSyncStore } from "../CampaignPage/hooks/useSyncStore";

export function CockpitPage() {
  useSyncStore();
  const { campaignId } = useParams();
  const [guideDrawerOpen, setGuideDrawerOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [activeEntity, setActiveEntity] = useState<EntityRef | null>(null);
  const navigate = useNavigate();
  const { isPending: campaignLoading, data: campaignData } =
    useCampaignQuery(campaignId);

  const campaignName = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.name
  );
  const isCampaignLoaded = useStore(
    (store) => !!store.campaigns.currentCampaign.currentCampaign
  );
  const campaignType = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.type
  );

  const loadGuideState = useStore((store) => store.aiGuide.loadGuideState);

  useEffect(() => {
    if (campaignId) {
      loadGuideState(campaignId);
    }
  }, [campaignId, loadGuideState]);

  // Redirect non-AI-guided campaigns back to the campaign sheet
  useEffect(() => {
    if (
      isCampaignLoaded &&
      campaignType !== CampaignType.AIGuided &&
      campaignId
    ) {
      navigate(constructCampaignSheetPath(campaignId, CAMPAIGN_ROUTES.SHEET), {
        replace: true,
      });
    }
  }, [isCampaignLoaded, campaignType, campaignId, navigate]);

  if (campaignLoading || (!!campaignData && !isCampaignLoaded)) {
    return <LinearProgress />;
  }

  if (!isCampaignLoaded) {
    return (
      <>
        <PageHeader />
        <PageContent isPaper>
          <EmptyState
            title="Campaign not Found"
            message="Please try again from the campaign selection page"
            showImage
            callToAction={
              <Button
                LinkComponent={LinkComponent}
                href={constructCampaignPath(CAMPAIGN_ROUTES.SELECT)}
                variant="contained"
                size="large"
              >
                Campaign Select
              </Button>
            }
          />
        </PageContent>
      </>
    );
  }

  const campaignSheetPath = campaignId
    ? constructCampaignSheetPath(campaignId, CAMPAIGN_ROUTES.SHEET)
    : "";

  return (
    <>
      <Head
        title={campaignName ?? ""}
        description={`${campaignName ?? ""} — AI Guided Play`}
      />
      <CockpitContext.Provider value={{ openEntity: setActiveEntity }}>
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1,
            py: 0.5,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: "background.default",
            gap: 1,
          }}
        >
          <Button
            LinkComponent={LinkComponent}
            href={campaignSheetPath}
            startIcon={<ArrowBack />}
            size="small"
            color="inherit"
          >
            {campaignName}
          </Button>
        </Box>
        <CockpitTopBar
          onOpenGuide={() => setGuideDrawerOpen(true)}
          onOpenHistory={() => setHistoryDrawerOpen(true)}
        />
        <Box
          sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(260px, 300px) 1fr minmax(280px, 340px)",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              borderRight: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paperInlay",
              overflow: "hidden",
              display: { xs: "none", lg: "block" },
            }}
          >
            <CockpitLeftRail />
          </Box>
          <Box
            sx={{
              borderRight: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paper",
              overflow: "hidden",
            }}
          >
            <CockpitCenter />
          </Box>
          <Box
            sx={{
              bgcolor: "background.paperInlay",
              overflow: "hidden",
              display: { xs: "none", md: "block" },
            }}
          >
            <CockpitRightRail />
          </Box>
        </Box>
      </Box>
      <AskGuideDrawer
        open={guideDrawerOpen}
        onClose={() => setGuideDrawerOpen(false)}
      />
      <SessionHistoryDrawer
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
      />
      <EntityDrawer
        entity={activeEntity}
        onClose={() => setActiveEntity(null)}
      />
      </CockpitContext.Provider>
    </>
  );
}
