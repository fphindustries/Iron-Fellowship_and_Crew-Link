import { createHomebrewListenerFunction } from "api-calls/homebrew/homebrewListenerFunction";
import { HOMEBREW_MOVES_TABLE } from "./_getRef";

export const listenToHomebrewMoves = createHomebrewListenerFunction(
  HOMEBREW_MOVES_TABLE
);
