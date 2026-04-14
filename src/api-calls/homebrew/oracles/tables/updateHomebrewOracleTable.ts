import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HomebrewOracleTableDocument } from "api-calls/homebrew/oracles/tables/_homebrewOracleTable.type";
import { HOMEBREW_ORACLE_TABLES_TABLE } from "./_getRef";

export const updateHomebrewOracleTable = createApiFunction<
  {
    oracleTableId: string;
    oracleTable: Partial<HomebrewOracleTableDocument>;
  },
  void
>(async (params) => {
  const { oracleTableId, oracleTable } = params;

  const updates: Record<string, unknown> = {};

  if (oracleTable.oracleCollectionId !== undefined) {
    updates.oracle_collection_id = oracleTable.oracleCollectionId;
  }

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_ORACLE_TABLES_TABLE)
    .select("data")
    .eq("id", oracleTableId)
    .single();

  if (fetchError) throw fetchError;

  updates.data = { ...(existing?.data as object ?? {}), ...oracleTable };

  const { error } = await supabase
    .from(HOMEBREW_ORACLE_TABLES_TABLE)
    .update(updates as any)
    .eq("id", oracleTableId);

  if (error) throw error;
}, "Failed to update oracle table.");
