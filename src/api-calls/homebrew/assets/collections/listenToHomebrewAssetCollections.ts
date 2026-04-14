import { createHomebrewListenerFunction } from "api-calls/homebrew/homebrewListenerFunction";
import { HOMEBREW_ASSET_COLLECTIONS_TABLE } from "./_getRef";

export const listenToHomebrewAssetCollections = createHomebrewListenerFunction(
  HOMEBREW_ASSET_COLLECTIONS_TABLE
);
