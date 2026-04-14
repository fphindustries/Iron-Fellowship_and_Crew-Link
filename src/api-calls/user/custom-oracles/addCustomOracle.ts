import { supabase } from "config/supabase.config";
import { StoredOracle } from "api-calls/user/custom-oracles/_custom-oracles.type";
import { createApiFunction } from "api-calls/createApiFunction";

export const addCustomOracle = createApiFunction<
  {
    uid: string;
    customOracle: StoredOracle;
  },
  void
>((params) => {
  const { uid, customOracle } = params;

  return new Promise((resolve, reject) => {
    Promise.resolve(
      supabase.from("user_custom_oracles").insert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: customOracle.$id, user_id: uid, data: customOracle } as any
      )
    )
      .then(({ error }: { error: unknown }) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      })
      .catch((error: unknown) => reject(error));
  });
}, "Failed to create custom oracle.");
