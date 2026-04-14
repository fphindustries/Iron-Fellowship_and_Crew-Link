import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HomebrewOracleTableDocument } from "api-calls/homebrew/oracles/tables/_homebrewOracleTable.type";
import { HOMEBREW_ORACLE_TABLES_TABLE } from "./_getRef";

export const createHomebrewOracleTable = createApiFunction<
  { oracleTable: HomebrewOracleTableDocument },
  void
>(async (params) => {
  const { oracleTable } = params;
  const { error } = await supabase.from(HOMEBREW_ORACLE_TABLES_TABLE).insert({
    collection_id: oracleTable.collectionId,
    oracle_collection_id: oracleTable.oracleCollectionId,
    data: oracleTable,
  } as any);
  if (error) throw error;
}, "Failed to create oracle table.");
