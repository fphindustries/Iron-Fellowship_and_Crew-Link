import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const removeCustomMove = createApiFunction<
  {
    uid: string;
    moveId: string;
  },
  void
>((params) => {
  const { uid, moveId } = params;

  return new Promise((resolve, reject) => {
    Promise.resolve(
      supabase
        .from("user_custom_moves")
        .delete()
        .eq("id", moveId)
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
}, "Failed to remove custom move.");
