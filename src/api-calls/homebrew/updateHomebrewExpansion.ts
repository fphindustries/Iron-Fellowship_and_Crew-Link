import { supabase } from "config/supabase.config";
import { ExpansionDocument } from "api-calls/homebrew/_homebrewCollection.type";
import { createApiFunction } from "api-calls/createApiFunction";
import { HOMEBREW_COLLECTION_TABLE } from "./_getRef";

export const updateHomebrewExpansion = createApiFunction<
  { id: string; expansion: Partial<ExpansionDocument> },
  void
>(async (params) => {
  const { id, expansion } = params;

  const updates: Record<string, unknown> = {};
  if (expansion.title !== undefined) updates.title = expansion.title;
  if (expansion.description !== undefined) updates.description = expansion.description;
  if (expansion.rulesetId !== undefined) updates.setting_key = expansion.rulesetId;
  if (expansion.editors !== undefined) updates.editors = expansion.editors;
  if (expansion.viewers !== undefined) updates.viewers = expansion.viewers;

  const { error } = await supabase
    .from(HOMEBREW_COLLECTION_TABLE)
    .update(updates as any)
    .eq("id", id);

  if (error) throw error;
}, "Failed to update expansion.");
