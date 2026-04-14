import { supabase } from "config/supabase.config";
import { replaceImage } from "lib/storage.lib";
import {
  constructCharacterPortraitFolderPath,
} from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateCharacterPortrait = createApiFunction<
  {
    uid: string;
    characterId: string;
    oldPortraitFilename?: string;
    portrait?: File;
    scale: number;
    position: { x: number; y: number };
  },
  void
>((params) => {
  const { uid, characterId, oldPortraitFilename, portrait, scale, position } =
    params;

  return new Promise((resolve, reject) => {
    let replaceImagePromise: Promise<void>;

    if (portrait) {
      replaceImagePromise = replaceImage(
        constructCharacterPortraitFolderPath(uid, characterId),
        oldPortraitFilename,
        portrait
      );
    } else {
      replaceImagePromise = Promise.resolve();
    }

    replaceImagePromise
      .then(() => {
        const updateFields = portrait
          ? {
              profile_image: {
                filename: portrait.name,
                position,
                scale,
              },
            }
          : {
              "profile_image.position": position,
              "profile_image.scale": scale,
            };

        supabase
          .from("characters")
          .update(updateFields as Record<string, unknown> as any)
          .eq("id", characterId)
          .then(({ error }: { error: unknown }) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
      });
  });
}, "Failed to update character portrait");
