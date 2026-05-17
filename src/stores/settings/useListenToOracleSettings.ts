import { useEffect } from "react";
import { useStore } from "stores/store";

export function useListenToOracleSettings() {
  const uid = useStore((store) => store.auth.user?.id);
  const subscribe = useStore(
    (store) => store.settings.subscribeToPinnedOracleSettings
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (uid) {
      unsubscribe = subscribe(uid);
    }
    return () => {
      unsubscribe?.();
    };
  }, [uid, subscribe]);
}
