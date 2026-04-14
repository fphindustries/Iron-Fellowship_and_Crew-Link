import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HomebrewMoveCategoryDocument } from "api-calls/homebrew/moves/categories/_homebrewMoveCategory.type";
import { HOMEBREW_MOVE_CATEGORIES_TABLE } from "./_getRef";

export const createHomebrewMoveCategory = createApiFunction<
  { moveCategory: HomebrewMoveCategoryDocument },
  void
>(async (params) => {
  const { moveCategory } = params;
  const { error } = await supabase.from(HOMEBREW_MOVE_CATEGORIES_TABLE).insert({
    collection_id: moveCategory.collectionId,
    data: moveCategory,
  } as any);
  if (error) throw error;
}, "Failed to create move category.");
