import { supabase } from "config/supabase.config";
import { CampaignDocument } from "api-calls/campaign/_campaign.type";
import { CAMPAIGN_TABLE, CAMPAIGN_MEMBERS_TABLE } from "./_getRef";

export function listenToUsersCampaigns(
  uid: string,
  dataHandler: {
    onDocChange: (id: string, data: CampaignDocument) => void;
    onDocRemove: (id: string) => void;
    onLoaded: () => void;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void
): () => void {
  const fetchUserCampaigns = () => {
    supabase
      .from(CAMPAIGN_MEMBERS_TABLE)
      .select(`campaign_id, ${CAMPAIGN_TABLE}(*)`)
      .eq("user_id", uid)
      .then((result: { data: unknown[] | null; error: unknown }) => {
        if (result.error) {
          onError(result.error);
          return;
        }
        const rows = result.data ?? [];
        if (rows.length === 0) {
          dataHandler.onLoaded();
          return;
        }
        (rows as Record<string, unknown>[]).forEach((row) => {
          const campaign = row[CAMPAIGN_TABLE] as CampaignDocument | undefined;
          const campaignId = row.campaign_id as string;
          if (campaign) {
            dataHandler.onDocChange(campaignId, campaign);
          }
        });
        dataHandler.onLoaded();
      });
  };

  // Initial fetch
  fetchUserCampaigns();

  // Listen for membership changes (user added/removed from campaigns)
  const memberChannel = supabase
    .channel(`campaign_members:${uid}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: CAMPAIGN_MEMBERS_TABLE,
        filter: `user_id=eq.${uid}`,
      },
      (payload: { eventType: string; old: Record<string, unknown> }) => {
        if (payload.eventType === "DELETE") {
          const campaignId = payload.old.campaign_id as string | undefined;
          if (campaignId) {
            dataHandler.onDocRemove(campaignId);
          }
        } else {
          fetchUserCampaigns();
        }
      }
    )
    .subscribe();

  // Listen for changes to campaigns the user is in
  const campaignChannel = supabase
    .channel(`campaigns_for_user:${uid}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: CAMPAIGN_TABLE },
      (payload: {
        eventType: string;
        old: Record<string, unknown>;
        new: Record<string, unknown>;
      }) => {
        if (payload.eventType === "DELETE") {
          dataHandler.onDocRemove(payload.old.id as string);
        } else {
          dataHandler.onDocChange(
            payload.new.id as string,
            payload.new as unknown as CampaignDocument
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(memberChannel);
    supabase.removeChannel(campaignChannel);
  };
}
