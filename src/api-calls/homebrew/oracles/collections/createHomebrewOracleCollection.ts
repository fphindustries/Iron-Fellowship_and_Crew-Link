import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HomebrewOracleCollectionDocument } from "api-calls/homebrew/oracles/collections/_homebrewOracleCollection.type";
import { HOMEBREW_ORACLE_COLLECTIONS_TABLE } from "./_getRef";

export const createHomebrewOracleCollection = createApiFunction<
  { oracleCollection: HomebrewOracleCollectionDocument },
  void
>(async (params) => {
  const { oracleCollection } = params;
  const { error } = await supabase
    .from(HOMEBREW_ORACLE_COLLECTIONS_TABLE)
    .insert({
      collection_id: oracleCollection.collectionId,
      data: oracleCollection,
    } as any);
  if (error) throw error;
}, "Failed to create oracle collection.");
