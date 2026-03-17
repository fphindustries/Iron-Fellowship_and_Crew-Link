import { useEffect } from "react";
import { useStore } from "stores/store";

export function useListenToWorldAiSettings() {
  const worldId = useStore(
    (store) => store.worlds.currentWorld.currentWorldId
  );
  const subscribe = useStore(
    (store) => store.worlds.currentWorld.subscribeToWorldAiSettings
  );

  useEffect(() => {
    if (!worldId) return;
    const unsubscribe = subscribe(worldId);
    return () => unsubscribe();
  }, [worldId, subscribe]);
}
