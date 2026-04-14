import { createHomebrewListenerFunction } from "api-calls/homebrew/homebrewListenerFunction";
import { HOMEBREW_ASSETS_TABLE } from "./_getRef";

export const listenToHomebrewAssets = createHomebrewListenerFunction(
  HOMEBREW_ASSETS_TABLE
);
