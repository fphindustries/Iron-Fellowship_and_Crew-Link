import { useEffect } from "react";
import { useStore } from "stores/store";

export function useListenToAuth() {
  const subscribe = useStore((store) => store.auth.subscribe);

  useEffect(() => {
    return subscribe();
  }, [subscribe]);
}
