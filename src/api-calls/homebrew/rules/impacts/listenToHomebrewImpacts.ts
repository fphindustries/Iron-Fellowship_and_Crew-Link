import { createHomebrewListenerFunction } from "api-calls/homebrew/homebrewListenerFunction";
import { HOMEBREW_IMPACTS_TABLE } from "./_getRef";

export const listenToHomebrewImpacts = createHomebrewListenerFunction(
  HOMEBREW_IMPACTS_TABLE
);
