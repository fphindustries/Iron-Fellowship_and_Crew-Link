import { supabase } from "config/supabase.config";
import { UserDocument } from "api-calls/user/_user.type";
import { createApiFunction } from "api-calls/createApiFunction";

// Partial update for user document fields. Maps UserDocument shape to
// Supabase column names where applicable.
type PartialUserDocument = Partial<UserDocument>;

export const updateUserDocNestedFields = createApiFunction<
  { uid: string; user: PartialUserDocument },
  void
>((params) => {
  const { uid, user } = params;
  return new Promise((resolve, reject) => {
    const updates: { display_name?: string; photo_url?: string | null } = {};

    if (user.displayName !== undefined) {
      updates["display_name"] = user.displayName;
    }
    if (user.photoURL !== undefined) {
      updates["photo_url"] = user.photoURL ?? null;
    }

    if (Object.keys(updates).length === 0) {
      resolve();
      return;
    }

    Promise.resolve(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from("users").update(updates as any).eq("id", uid)
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
