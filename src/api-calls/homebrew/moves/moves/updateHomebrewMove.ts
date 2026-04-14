import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_MOVES_TABLE } from "./_getRef";
import { HomebrewMoveDocument } from "api-calls/homebrew/moves/moves/_homebrewMove.type";

export const updateHomebrewMove = createApiFunction<
  {
    moveId: string;
    move: Partial<HomebrewMoveDocument>;
  },
  void
>(async (params) => {
  const { moveId, move } = params;

  const updates: Record<string, unknown> = {};

  if ((move as any).categoryId !== undefined) {
    updates.move_category_id = (move as any).categoryId;
  }

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_MOVES_TABLE)
    .select("data")
    .eq("id", moveId)
    .single();

  if (fetchError) throw fetchError;

  updates.data = { ...(existing?.data as object ?? {}), ...move };

  const { error } = await supabase
    .from(HOMEBREW_MOVES_TABLE)
    .update(updates as any)
    .eq("id", moveId);

  if (error) throw error;
}, "Failed to update move.");
