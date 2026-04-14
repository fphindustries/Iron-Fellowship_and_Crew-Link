import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const removeCustomOracle = createApiFunction<
  {
    uid: string;
    oracleId: string;
  },
  void
>((params) => {
  const { uid, oracleId } = params;

  return new Promise((resolve, reject) => {
    Promise.resolve(
      supabase
        .from("user_custom_oracles")
        .delete()
        .eq("id", oracleId)
        .eq("user_id", uid)
    )
      .then(({ error }) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      })
      .catch((error: unknown) => reject(error));
  });
}, "Failed to remove custom oracle.");
