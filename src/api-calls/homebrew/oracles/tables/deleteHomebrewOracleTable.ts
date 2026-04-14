import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_ORACLE_TABLES_TABLE } from "./_getRef";

export const deleteHomebrewOracleTable = createApiFunction<
  {
    oracleTableId: string;
  },
  void
>(async (params) => {
  const { oracleTableId } = params;
  const { error } = await supabase
    .from(HOMEBREW_ORACLE_TABLES_TABLE)
    .delete()
    .eq("id", oracleTableId);
  if (error) throw error;
}, "Failed to delete oracle table.");
