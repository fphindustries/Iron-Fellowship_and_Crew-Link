import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_MOVE_CATEGORIES_TABLE } from "./_getRef";
import { HomebrewMoveCategoryDocument } from "api-calls/homebrew/moves/categories/_homebrewMoveCategory.type";

export const updateHomebrewMoveCategory = createApiFunction<
  {
    moveCategoryId: string;
    moveCategory: Partial<HomebrewMoveCategoryDocument>;
  },
  void
>(async (params) => {
  const { moveCategory, moveCategoryId } = params;

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_MOVE_CATEGORIES_TABLE)
    .select("data")
    .eq("id", moveCategoryId)
    .single();

  if (fetchError) throw fetchError;

  const updatedData = { ...(existing?.data as object ?? {}), ...moveCategory };

  const { error } = await supabase
    .from(HOMEBREW_MOVE_CATEGORIES_TABLE)
    .update({ data: updatedData })
    .eq("id", moveCategoryId);

  if (error) throw error;
}, "Failed to update move category.");
