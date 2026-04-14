import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_MOVES_TABLE } from "./_getRef";

export const deleteHomebrewMove = createApiFunction<
  {
    moveId: string;
  },
  void
>(async (params) => {
  const { moveId } = params;
  const { error } = await supabase
    .from(HOMEBREW_MOVES_TABLE)
    .delete()
    .eq("id", moveId);
  if (error) throw error;
}, "Failed to delete move.");
