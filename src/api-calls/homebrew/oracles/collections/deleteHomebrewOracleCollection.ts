import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_ORACLE_COLLECTIONS_TABLE } from "./_getRef";

export const deleteHomebrewOracleCollection = createApiFunction<
  {
    oracleCollectionId: string;
  },
  void
>(async (params) => {
  const { oracleCollectionId } = params;
  const { error } = await supabase
    .from(HOMEBREW_ORACLE_COLLECTIONS_TABLE)
    .delete()
    .eq("id", oracleCollectionId);
  if (error) throw error;
}, "Failed to delete oracle collection.");
