import { createHomebrewListenerFunction } from "api-calls/homebrew/homebrewListenerFunction";
import { HOMEBREW_NON_LINEAR_METERS_TABLE } from "./_getRef";

export const listenToHomebrewNonLinearMeters = createHomebrewListenerFunction(
  HOMEBREW_NON_LINEAR_METERS_TABLE
);
