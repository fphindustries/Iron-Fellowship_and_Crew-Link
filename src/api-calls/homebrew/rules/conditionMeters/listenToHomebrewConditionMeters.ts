import { createHomebrewListenerFunction } from "api-calls/homebrew/homebrewListenerFunction";
import { HOMEBREW_CONDITION_METERS_TABLE } from "./_getRef";

export const listenToHomebrewConditionMeters = createHomebrewListenerFunction(
  HOMEBREW_CONDITION_METERS_TABLE
);
