import { supabase } from "config/supabase.config";
import { ExpansionDocument } from "api-calls/homebrew/_homebrewCollection.type";
import { createApiFunction } from "api-calls/createApiFunction";
import { HOMEBREW_COLLECTION_TABLE } from "./_getRef";

export const createHomebrewExpansion = createApiFunction<
  ExpansionDocument,
  string
>(async (expansion: ExpansionDocument) => {
  const { data, error } = await supabase
    .from(HOMEBREW_COLLECTION_TABLE)
    .insert({
      title: expansion.title,
      description: expansion.description,
      setting_key: expansion.rulesetId,
      owners: [expansion.creator],
      editors: expansion.editors,
      viewers: expansion.viewers ?? [],
      is_public: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}, "Failed to create expansion.");
