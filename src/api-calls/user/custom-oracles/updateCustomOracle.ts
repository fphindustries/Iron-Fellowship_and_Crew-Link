import { supabase } from "config/supabase.config";
import { StoredOracle } from "api-calls/user/custom-oracles/_custom-oracles.type";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateCustomOracle = createApiFunction<
  {
    uid: string;
    oracleId: string;
    customOracle: StoredOracle;
  },
  void
>((params) => {
  const { uid, oracleId, customOracle } = params;

  return new Promise((resolve, reject) => {
    if (oracleId !== customOracle.$id) {
      // ID changed: delete the old row and insert a new one
      Promise.resolve(
        supabase
          .from("user_custom_oracles")
          .delete()
          .eq("id", oracleId)
          .eq("user_id", uid)
      )
        .then(({ error }: { error: unknown }) => {
          if (error) return Promise.reject(error);
          return Promise.resolve(
            supabase.from("user_custom_oracles").insert(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { id: customOracle.$id, user_id: uid, data: customOracle } as any
            )
          );
        })
        .then(({ error }: { error: unknown }) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        })
        .catch((error: unknown) => reject(error));
    } else {
      Promise.resolve(
        supabase
          .from("user_custom_oracles")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ data: customOracle } as any)
          .eq("id", oracleId)
          .eq("user_id", uid)
      )
        .then(({ error }: { error: unknown }) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        })
        .catch((error: unknown) => reject(error));
    }
  });
}, "Failed to update custom oracle.");
