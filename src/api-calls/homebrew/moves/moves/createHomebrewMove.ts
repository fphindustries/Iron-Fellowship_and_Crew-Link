import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_MOVES_TABLE } from "./_getRef";
import { HomebrewMoveDocument } from "api-calls/homebrew/moves/moves/_homebrewMove.type";

export const createHomebrewMove = createApiFunction<
  { move: HomebrewMoveDocument },
  void
>(async (params) => {
  const { move } = params;
  const { error } = await supabase.from(HOMEBREW_MOVES_TABLE).insert({
    collection_id: move.collectionId,
    move_category_id: move.categoryId,
    data: move,
  } as any);
  if (error) throw error;
}, "Failed to create move.");
