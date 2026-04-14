import { supabase } from "config/supabase.config";
import { StoredMove } from "types/Moves.type";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateCustomMove = createApiFunction<
  {
    uid: string;
    moveId: string;
    customMove: StoredMove;
  },
  void
>((params) => {
  const { uid, moveId, customMove } = params;

  return new Promise((resolve, reject) => {
    if (moveId !== customMove.$id) {
      // ID changed: delete the old row and insert a new one
      Promise.resolve(
        supabase
          .from("user_custom_moves")
          .delete()
          .eq("id", moveId)
          .eq("user_id", uid)
      )
        .then(({ error }: { error: unknown }) => {
          if (error) return Promise.reject(error);
          return Promise.resolve(
            supabase.from("user_custom_moves").insert(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { id: customMove.$id, user_id: uid, data: customMove } as any
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
          .from("user_custom_moves")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ data: customMove } as any)
          .eq("id", moveId)
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
}, "Failed to update custom move.");
