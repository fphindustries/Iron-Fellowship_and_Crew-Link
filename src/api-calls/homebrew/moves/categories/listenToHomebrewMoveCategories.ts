import { createHomebrewListenerFunction } from "api-calls/homebrew/homebrewListenerFunction";
import { HOMEBREW_MOVE_CATEGORIES_TABLE } from "./_getRef";

export const listenToHomebrewMoveCategories = createHomebrewListenerFunction(
  HOMEBREW_MOVE_CATEGORIES_TABLE
);
