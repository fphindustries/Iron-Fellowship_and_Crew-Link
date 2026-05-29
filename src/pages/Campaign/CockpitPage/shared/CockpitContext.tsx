import { createContext, useContext } from "react";

export type EntityRef =
  | { type: "npc"; name: string }
  | { type: "move"; moveId: string }
  | { type: "vow"; trackId: string; label: string };

interface CockpitContextValue {
  openEntity: (ref: EntityRef) => void;
}

export const CockpitContext = createContext<CockpitContextValue>({
  openEntity: () => {},
});

export function useCockpit() {
  return useContext(CockpitContext);
}
