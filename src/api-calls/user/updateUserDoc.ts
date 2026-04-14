import { supabase } from "config/supabase.config";
import { UserDocument } from "api-calls/user/_user.type";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateUserDoc = createApiFunction<
  { uid: string; user: UserDocument },
  void
>((params) => {
  const { uid, user } = params;
  return new Promise((resolve, reject) => {
    Promise.resolve(
      supabase.from("users").upsert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: uid, display_name: user.displayName, photo_url: user.photoURL ?? null } as any
      )
    )
      .then(({ error }: { error: unknown }) => {
        if (error) {
          console.error(error);
          reject("Failed to update user");
        } else {
          resolve();
        }
      })
      .catch((error: unknown) => {
        console.error(error);
        reject("Failed to update user");
      });
  });
}, "Failed to update user information.");
