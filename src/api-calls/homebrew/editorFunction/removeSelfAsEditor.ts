import { supabase } from "config/supabase.config";

export function removeSelfAsEditor(
  homebrewCollectionId: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    supabase.functions
      .invoke("remove-current-user-as-homebrew-editor", {
        body: { homebrewCollectionId },
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
