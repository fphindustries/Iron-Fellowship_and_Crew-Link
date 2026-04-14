import { supabase } from "config/supabase.config";
import { UserDocument } from "api-calls/user/_user.type";
import { createApiFunction } from "api-calls/createApiFunction";
import { UserRow } from "lib/database.types";

function rowToUserDoc(row: UserRow): UserDocument {
  return {
    displayName: row.display_name,
    photoURL: row.photo_url ?? undefined,
  };
}

export const getUserDoc = createApiFunction<{ uid: string }, UserDocument>(
  (params) => {
    const { uid } = params;

    return new Promise((resolve, reject) => {
      Promise.resolve(
        supabase.from("users").select("*").eq("id", uid).single()
      )
        .then(({ data, error }) => {
          if (error || !data) {
            console.error(error);
            reject("User not found.");
          } else {
            resolve(rowToUserDoc(data));
          }
        })
        .catch((error: unknown) => {
          console.error(error);
          reject("Failed to load user.");
        });
    });
  },
  "Failed to load user information."
);
