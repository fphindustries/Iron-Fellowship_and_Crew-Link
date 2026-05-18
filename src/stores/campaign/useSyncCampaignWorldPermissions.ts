import { CampaignType } from "types/Campaign.type";
import { useEffect, useMemo } from "react";
import { useStore } from "stores/store";
import { useAllWorldsQuery } from "hooks/queries/useWorldsQuery";

export function useSyncCampaignWorldPermissions() {
  const uid = useStore((store) => store.auth.uid);
  const campaigns = useStore((store) => store.campaigns.campaignMap);
  const areCampaignsLoading = useStore((store) => store.campaigns.loading);
  const { data: worlds, isLoading: areWorldsLoading } = useAllWorldsQuery();

  const campaignGuideMap = useMemo(() => {
    const map: { [worldId: string]: string } = {};
    Object.keys(campaigns).forEach((campaignKey) => {
      const campaign = campaigns[campaignKey];
      const worldId = campaign.worldId;
      if (
        worldId &&
        (campaign.type === CampaignType.Coop ||
          (campaign.type === CampaignType.Guided &&
            campaign.gmIds?.includes(uid)))
      ) {
        map[worldId] = campaignKey;
      }
    });
    return map;
  }, [campaigns, uid]);

  const updateWorldGuides = useStore((store) => store.worlds.updateWorldGuide);

  useEffect(() => {
    if (uid && !areCampaignsLoading && !areWorldsLoading) {
      (worlds ?? []).forEach((world) => {
        const worldId = world.id;
        const isFullOwner = world.ownerIds.includes(uid);
        const isPartialOwner = world.campaignGuides?.includes(uid);
        if (campaignGuideMap[worldId] && !isFullOwner && !isPartialOwner) {
          updateWorldGuides(worldId, uid);
        } else if (!campaignGuideMap[worldId] && isPartialOwner) {
          updateWorldGuides(worldId, uid, true);
        }
      });
    }
  }, [
    worlds,
    areCampaignsLoading,
    areWorldsLoading,
    updateWorldGuides,
    campaignGuideMap,
    uid,
  ]);
}
