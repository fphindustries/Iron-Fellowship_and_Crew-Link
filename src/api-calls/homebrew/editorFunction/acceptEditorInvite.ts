import { supabase } from "config/supabase.config";

export function acceptEditorInvite(
  homebrewCollectionId: string,
  inviteKey: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    supabase.functions
      .invoke("add-current-user-as-homebrew-editor", {
        body: { inviteKey, homebrewCollectionId },
      })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          reject(error);
          return;
        }
        resolve(data as boolean);
      })
      .catch((e) => {
        console.error(e);
        reject(e);
      });
  });
}
