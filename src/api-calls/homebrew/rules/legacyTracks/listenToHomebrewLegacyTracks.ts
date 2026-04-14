import { createHomebrewListenerFunction } from "api-calls/homebrew/homebrewListenerFunction";
import { HOMEBREW_LEGACY_TRACKS_TABLE } from "./_getRef";

export const listenToHomebrewLegacyTracks = createHomebrewListenerFunction(
  HOMEBREW_LEGACY_TRACKS_TABLE
);
