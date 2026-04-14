import { useEffect } from "react";
import { useStore } from "stores/store";

export function useListenToHomebrew() {
  const uid = useStore((store) => store.auth.user?.id);
  const subscribe = useStore((store) => store.homebrew.subscribe);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined = undefined;

    if (uid) {
      unsubscribe = subscribe(uid);
    }

    return () => {
      unsubscribe && unsubscribe();
    };
  }, [uid, subscribe]);
}
