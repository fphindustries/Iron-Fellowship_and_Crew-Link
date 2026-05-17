import { useEffect } from "react";
import { useStore } from "stores/store";

export function useListenToAccessibilitySettings() {
  const uid = useStore((store) => store.auth.user?.id);
  const subscribe = useStore(
    (store) => store.accessibilitySettings.listenToSettings
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
