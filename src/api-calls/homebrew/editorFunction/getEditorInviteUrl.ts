import { supabase } from "config/supabase.config";
import { constructHomebrewEditorInvitePath } from "pages/Homebrew/routes";

export function getEditorInviteUrl(
  homebrewCollectionId: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    supabase.functions
      .invoke("get-homebrew-editor-invite-key", {
        body: { homebrewCollectionId },
      })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          reject(error);
          return;
        }
        if (data) {
          resolve(constructHomebrewEditorInvitePath(data as string));
        } else {
          console.error("NO INVITE KEY RETURNED");
          reject(new Error("No invite key was returned"));
        }
      })
      .catch((e) => {
        console.error(e);
        reject(e);
      });
  });
}
