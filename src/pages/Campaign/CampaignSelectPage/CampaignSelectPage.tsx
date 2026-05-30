import {
  Box,
  Button,
  Hidden,
  LinearProgress,
  Alert,
  AlertTitle,
} from "@mui/material";
import { useMemo, useState } from "react";
import { EmptyState } from "components/shared/EmptyState/EmptyState";
import { CreateCampaignDialog } from "./components/CreateCampaignDialog";
import CreateCampaignIcon from "@mui/icons-material/GroupAdd";
import { PageContent, PageHeader } from "components/shared/Layout";
import { CampaignCard } from "./components/CampaignCard";
import { Head } from "providers/HeadProvider/Head";
import { useStore } from "stores/store";
import { useAppName } from "hooks/useAppName";
import { FooterFab } from "components/shared/Layout/FooterFab";
import { useCampaignsQuery } from "hooks/queries/useCampaignsQuery";
import { toCampaignDocument } from "stores/campaign/campaign.slice";
import { getErrorMessage } from "functions/getErrorMessage";

export function CampaignSelectPage() {
  const uid = useStore((store) => store.auth.user?.id);
  const { data: campaignRows = [], isLoading: loading, error } = useCampaignsQuery(uid);
  const campaignMap = useMemo(
    () =>
      Object.fromEntries(
        campaignRows.map((row) => [row.id, toCampaignDocument(row)])
      ),
    [campaignRows]
  );
  const sortedCampaignIds = useMemo(
    () =>
      Object.keys(campaignMap).sort((key1, key2) => {
        const name1 = campaignMap[key1].name;
        const name2 = campaignMap[key2].name;

        if (name1 < name2) {
          return -1;
        } else if (name1 > name2) {
          return 1;
        }
        return 0;
      }),
    [campaignMap]
  );
  const errorMessage = error
    ? getErrorMessage(error, "Failed to load your campaigns.")
    : undefined;

  const [createCampaignDialogOpen, setCreateCampaignDialogOpen] =
    useState<boolean>(false);

  const appName = useAppName();

  if (loading) {
    return <LinearProgress color={"primary"} />;
  }

  return (
    <>
      <Head
        title={"Your Campaigns"}
        description={`A list of all the campaigns you have joined in ${appName}`}
      />
      <PageHeader
        label={"Your Campaigns"}
        actions={
          <Hidden smDown>
            <Button
              onClick={() => setCreateCampaignDialogOpen(true)}
              color={"primary"}
              variant={"contained"}
              endIcon={<CreateCampaignIcon aria-hidden />}
            >
              Create a Campaign
            </Button>
          </Hidden>
        }
      />
      <PageContent isPaper={sortedCampaignIds.length === 0}>
        {errorMessage && (
          <Alert severity="error">
            <AlertTitle>Error Loading Campaigns</AlertTitle>
            {errorMessage}
          </Alert>
        )}
        {sortedCampaignIds.length === 0 ? (
          <EmptyState
            showImage
            title={"No Campaigns Found"}
            message={
              "Campaigns allow you to share tracks, worlds, and more between guides and players"
            }
            callToAction={
              <Button
                onClick={() => setCreateCampaignDialogOpen(true)}
                variant={"contained"}
                endIcon={<CreateCampaignIcon />}
              >
                Create a Campaign
              </Button>
            }
          />
        ) : (
          <Box
            component={"ul"}
            display={"grid"}
            gridTemplateColumns={"repeat(12, 1fr)"}
            gap={2}
            pl={0}
            my={0}
            sx={{ listStyle: "none" }}
          >
            {sortedCampaignIds.map((campaignId) => (
              <Box
                component={"li"}
                gridColumn={{
                  xs: "span 12",
                  sm: "span 6",
                  md: "span 4",
                }}
                key={campaignId}
              >
                <CampaignCard
                  campaignId={campaignId}
                  campaign={campaignMap[campaignId]}
                />
              </Box>
            ))}
          </Box>
        )}
      </PageContent>

      <Hidden smUp>
        <Box height={80} />
      </Hidden>
      <Hidden smUp>
        <FooterFab
          onClick={() => setCreateCampaignDialogOpen(true)}
          color={"primary"}
        >
          <CreateCampaignIcon aria-label={"Create a Campaign"} />
        </FooterFab>
      </Hidden>
      <CreateCampaignDialog
        open={createCampaignDialogOpen}
        handleClose={() => setCreateCampaignDialogOpen(false)}
      />
    </>
  );
}
