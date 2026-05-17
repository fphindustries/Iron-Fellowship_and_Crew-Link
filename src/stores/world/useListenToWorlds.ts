import { useEffect } from "react";
import { useStore } from "stores/store";
import { shallow } from "zustand/shallow";

export function useListenToWorlds() {
  const uid = useStore((store) => store.auth.user?.id);
  const subscribeToOwnedWorlds = useStore(
    (store) => store.worlds.subscribeToOwnedWorlds
  );
  const ownedWorldsLoading = useStore((store) => store.worlds.loading);
  const ownedWorldIds = useStore((store) => {
    return Object.keys(store.worlds.worldMap);
  }, shallow);
  const subscribeToNonOwnedWorlds = useStore(
    (store) => store.worlds.subscribeToNonOwnedWorlds
  );

  const campaignsLoading = useStore((store) => store.campaigns.loading);
  const campaignWorldIds = useStore((store) => {
    const worldIds = new Set<string>();
    Object.values(store.campaigns.campaignMap).forEach((campaign) => {
      if (campaign.worldId) {
        worldIds.add(campaign.worldId);
      }
    });
    return Array.from(worldIds);
  }, shallow);

  useEffect(() => {
    const unsubscribe = subscribeToOwnedWorlds(uid);
    return () => {
      unsubscribe?.();
    };
  }, [uid, subscribeToOwnedWorlds]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (!ownedWorldsLoading && !campaignsLoading) {
      unsubscribe = subscribeToNonOwnedWorlds(campaignWorldIds, ownedWorldIds);
    }
    return () => {
      unsubscribe?.();
    };
  }, [
    ownedWorldIds,
    ownedWorldsLoading,
    campaignWorldIds,
    campaignsLoading,
    subscribeToNonOwnedWorlds,
  ]);
}
