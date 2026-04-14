import { supabase } from "config/supabase.config";
import { StoredMove } from "types/Moves.type";
import { createApiFunction } from "api-calls/createApiFunction";

export const addCustomMove = createApiFunction<
  {
    uid: string;
    customMove: StoredMove;
  },
  void
>((params) => {
  const { uid, customMove } = params;

  return new Promise((resolve, reject) => {
    Promise.resolve(
      supabase.from("user_custom_moves").insert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: customMove.$id, user_id: uid, data: customMove } as any
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
}, "Failed to add custom move.");
