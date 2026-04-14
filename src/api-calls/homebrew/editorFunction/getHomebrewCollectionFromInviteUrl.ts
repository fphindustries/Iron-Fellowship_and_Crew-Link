import { supabase } from "config/supabase.config";

export function getHomebrewCollectionFromInviteUrl(
  inviteKey: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    supabase.functions
      .invoke("get-homebrew-id-from-invite-key", {
        body: { inviteKey },
      })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          reject(error);
          return;
        }
        resolve(data as string | null);
      })
      .catch((e) => {
        console.error(e);
        reject(e);
      });
  });
}
