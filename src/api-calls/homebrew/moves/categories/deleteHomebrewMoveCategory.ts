import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_MOVE_CATEGORIES_TABLE } from "./_getRef";

export const deleteHomebrewMoveCategory = createApiFunction<
  {
    moveCategoryId: string;
  },
  void
>(async (params) => {
  const { moveCategoryId } = params;
  const { error } = await supabase
    .from(HOMEBREW_MOVE_CATEGORIES_TABLE)
    .delete()
    .eq("id", moveCategoryId);
  if (error) throw error;
}, "Failed to delete move category.");
