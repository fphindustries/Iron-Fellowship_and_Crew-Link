import { useEffect } from "react";
import { useStore } from "stores/store";

export function useListenToAuth() {
  const subscribe = useStore((store) => store.auth.subscribe);
  const uid = useStore((store) => store.auth.user?.id);
  const listenToUserDoc = useStore((store) => store.auth.subscribeToUser);

  useEffect(() => {
    const unsubscribe = subscribe();

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  useEffect(() => {
    let unsubscribe: () => void;

    if (uid) {
      unsubscribe = listenToUserDoc(uid);
    }
    return () => {
      unsubscribe && unsubscribe();
    };
  }, [uid, listenToUserDoc]);
}
