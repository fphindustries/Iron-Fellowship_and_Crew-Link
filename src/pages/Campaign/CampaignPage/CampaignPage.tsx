import { useStore } from "stores/store";
import { useSyncStore } from "./hooks/useSyncStore";
import { useState } from "react";
import { Button, LinearProgress, Stack } from "@mui/material";
import { useParams } from "react-router-dom";
import { useCampaignQuery } from "hooks/queries/useCampaignsQuery";
import { PageContent, PageHeader } from "components/shared/Layout";
import { EmptyState } from "components/shared/EmptyState";
import { LinkComponent } from "components/shared/LinkComponent";
import { CAMPAIGN_ROUTES, constructCampaignPath } from "../routes";
import { Head } from "providers/HeadProvider/Head";
import { SectionWithSidebar } from "components/shared/Layout/SectionWithSidebar";
import { Sidebar } from "pages/Character/CharacterSheetPage/components/Sidebar";
import { useCampaignType } from "hooks/useCampaignType";
import { CampaignContent } from "./components/CampaignContent";
import { CampaignType } from "types/Campaign.type";
import { CampaignSettingsMenu } from "./components/CampaignSettingsMenu";
import { CampaignMoveOracleButtons } from "./components/CampaignMoveOracleButtons";
import { InviteUsersDialog } from "./components/InviteUsersDialog";

export function CampaignPage() {
  useSyncStore();
  const { campaignId } = useParams();
  const { isPending: campaignLoading, data: campaignQueryData } = useCampaignQuery(campaignId);

  const campaignName = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.name
  );
  const isCampaignLoaded = useStore(
    (store) => !!store.campaigns.currentCampaign.currentCampaign
  );
  const hasGuide =
    useStore(
      (store) => store.campaigns.currentCampaign.currentCampaign?.gmIds ?? []
    ).length > 0;
  const { showGuidedPlayerView, campaignType } = useCampaignType();

  const [inviteUsersDialogOpen, setInviteUsersDialogOpen] =
    useState<boolean>(false);

  const uid = useStore((store) => store.auth.uid);
  const updateCampaignGuide = useStore(
    (store) => store.campaigns.currentCampaign.updateCampaignGM
  );

  if (campaignLoading || (!!campaignQueryData && !isCampaignLoaded)) {
    return <LinearProgress />;
  }

  if (!isCampaignLoaded) {
    return (
      <>
        <PageHeader />
        <PageContent isPaper>
          <EmptyState
            title={"Campaign not Found"}
            message={"Please try again from the campaign selection page"}
            showImage
            callToAction={
              <Button
                LinkComponent={LinkComponent}
                href={constructCampaignPath(CAMPAIGN_ROUTES.SELECT)}
                variant={"contained"}
                size={"large"}
              >
                Campaign Select
              </Button>
            }
          />
        </PageContent>
      </>
    );
  }

  const showMovesAndOracles = !(
    campaignType === CampaignType.Solo || showGuidedPlayerView
  );

  return (
    <>
      <Head
        title={campaignName ?? ""}
        description={`Campaign ${campaignName ?? ""}`}
      />
      <PageHeader
        label={campaignName ?? ""}
        actions={
          <Stack direction={"row"} flexWrap={"wrap"} spacing={1}>
            {campaignType !== CampaignType.Solo && (
              <Button
                variant={"contained"}
                onClick={() => setInviteUsersDialogOpen(true)}
              >
                Invite Players
              </Button>
            )}
            {campaignType === CampaignType.Guided && !hasGuide && (
              <Button
                variant={"outlined"}
                color={"inherit"}
                onClick={() => updateCampaignGuide(uid)}
              >
                Mark self as Guide
              </Button>
            )}
            <CampaignSettingsMenu />
          </Stack>
        }
      />
      <PageContent
        viewHeight
        isPaper
        sx={{
          pb: { xs: 14, md: 2 },
          pt: { xs: 0, md: 2 },
        }}
      >
        <SectionWithSidebar
          respectUserSetting
          sidebar={showMovesAndOracles && <Sidebar />}
          mainContent={
            <CampaignContent
              openInviteDialog={() => setInviteUsersDialogOpen(true)}
            />
          }
        />
        <CampaignMoveOracleButtons showFabs={showMovesAndOracles} />
      </PageContent>
      <InviteUsersDialog
        open={inviteUsersDialogOpen}
        onClose={() => setInviteUsersDialogOpen(false)}
      />
    </>
  );
}
