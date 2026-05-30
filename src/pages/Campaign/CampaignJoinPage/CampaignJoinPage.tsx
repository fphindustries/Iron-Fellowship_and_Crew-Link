import { Button, LinearProgress } from "@mui/material";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { EmptyState } from "components/shared/EmptyState/EmptyState";
import {
  CAMPAIGN_ROUTES,
  constructCampaignPath,
  constructCampaignSheetPath,
} from "../routes";
import { PageContent, PageHeader } from "components/shared/Layout";
import { Head } from "providers/HeadProvider/Head";
import { useStore } from "stores/store";
import { useAppName } from "hooks/useAppName";
import { ignoreApiError } from "config/api.config";
import {
  useCampaignQuery,
  useUpdateCampaignMemberMutation,
} from "hooks/queries/useCampaignsQuery";

export function CampaignJoinPage() {
  const { campaignId } = useParams();
  const uid = useStore((store) => store.auth.uid);

  const {
    data: campaign,
    isLoading: getCampaignLoading,
    error: getCampaignError,
  } = useCampaignQuery(campaignId);
  const addUserToCampaign = useUpdateCampaignMemberMutation(campaignId);
  const [addUserToCampaignLoading, setAddUserToCampaignLoading] =
    useState(false);

  const handleJoinCampaign = () => {
    if (campaignId && uid) {
      setAddUserToCampaignLoading(true);
      addUserToCampaign
        .mutateAsync({ userId: uid })
        .catch(ignoreApiError)
        .finally(() => setAddUserToCampaignLoading(false));
    }
  };

  const appName = useAppName();

  if (getCampaignLoading || !campaignId) {
    return (
      <LinearProgress
        sx={{
          width: "100vw",
          position: "absolute",
          left: 0,
          marginTop: -3,
        }}
      />
    );
  }

  if (getCampaignError) {
    return (
      <EmptyState
        title={"Error loading Campaign"}
        message={"We could not load this campaign."}
        showImage
        callToAction={
          <Button
            size={"large"}
            variant={"contained"}
            component={Link}
            to={constructCampaignPath(CAMPAIGN_ROUTES.SELECT)}
          >
            Go to your Campaigns
          </Button>
        }
      />
    );
  }

  if (!campaign) return null;

  if (uid && campaign.users.includes(uid)) {
    return (
      <Navigate
        to={constructCampaignSheetPath(campaignId, CAMPAIGN_ROUTES.SHEET)}
      />
    );
  }

  return (
    <>
      <Head
        title={`Join ${campaign.name}`}
        description={`Join your group and begin your adventure on ${appName}`}
      />
      <PageHeader label={"Join " + campaign.name} />
      <PageContent isPaper>
        <EmptyState
          title={`Join the fun`}
          message={"Find your group and begin your journey"}
          showImage
          callToAction={
            <Button
              size={"large"}
              variant={"contained"}
              onClick={() => handleJoinCampaign()}
              disabled={addUserToCampaignLoading}
            >
              Join {campaign.name}
            </Button>
          }
        />
      </PageContent>
    </>
  );
}
