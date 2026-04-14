import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HomebrewOracleCollectionDocument } from "api-calls/homebrew/oracles/collections/_homebrewOracleCollection.type";
import { HOMEBREW_ORACLE_COLLECTIONS_TABLE } from "./_getRef";

export const updateHomebrewOracleCollection = createApiFunction<
  {
    oracleCollectionId: string;
    oracleCollection: Partial<HomebrewOracleCollectionDocument>;
  },
  void
>(async (params) => {
  const { oracleCollectionId, oracleCollection } = params;

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_ORACLE_COLLECTIONS_TABLE)
    .select("data")
    .eq("id", oracleCollectionId)
    .single();

  if (fetchError) throw fetchError;

  const updatedData = { ...(existing?.data as object ?? {}), ...oracleCollection };

  const { error } = await supabase
    .from(HOMEBREW_ORACLE_COLLECTIONS_TABLE)
    .update({ data: updatedData })
    .eq("id", oracleCollectionId);

  if (error) throw error;
}, "Failed to update oracle collection.");
