import { useEffect } from "react";
import { getErrorMessage } from "functions/getErrorMessage";
import { useCampaignsQuery } from "hooks/queries/useCampaignsQuery";
import { useStore } from "stores/store";
import { toCampaignDocument } from "./campaign.slice";

export function useListenToCampaigns() {
  const uid = useStore((store) => store.auth.user?.id);
  const { data: campaignRows, isLoading, error } = useCampaignsQuery(uid);

  useEffect(() => {
    useStore.setState((store) => {
      store.campaigns.loading = isLoading;
      store.campaigns.error = error
        ? getErrorMessage(error, "Failed to load your campaigns.")
        : undefined;
    });
  }, [error, isLoading]);

  useEffect(() => {
    if (!campaignRows || !uid) return;
    useStore.setState((store) => {
      store.campaigns.campaignMap = Object.fromEntries(
        campaignRows.map((row) => [row.id, toCampaignDocument(row)])
      );
      store.campaigns.loading = false;
      store.campaigns.error = undefined;
    });
  }, [campaignRows, uid]);
}
