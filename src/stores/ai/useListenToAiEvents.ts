import { useEffect } from "react";
import { useStore } from "stores/store";

export function useListenToAiEvents() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const subscribe = useStore((store) => store.ai.subscribe);
  const resetStore = useStore((store) => store.ai.resetStore);

  useEffect(() => {
    if (!campaignId) {
      resetStore();
      return;
    }

    const unsubscribe = subscribe(campaignId);
    return () => {
      unsubscribe();
    };
  }, [campaignId, subscribe, resetStore]);
}
