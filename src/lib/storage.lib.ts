import { supabase } from "config/supabase.config";

export const MAX_FILE_SIZE = 2 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = "2 MB";

/**
 * Bucket routing: paths starting with "character-portraits/" go to the
 * character-portraits bucket; everything else goes to world-images.
 */
function parsePath(fullPath: string): { bucket: string; objectPath: string } {
  if (fullPath.startsWith("character-portraits/")) {
    return { bucket: "character-portraits", objectPath: fullPath.slice("character-portraits/".length) };
  }
  if (fullPath.startsWith("world-images/")) {
    return { bucket: "world-images", objectPath: fullPath.slice("world-images/".length) };
  }
  // Default: treat the full path as the object path in world-images
  return { bucket: "world-images", objectPath: fullPath };
}

export function uploadImage(path: string, image: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const { bucket, objectPath } = parsePath(`${path}/${image.name}`);

    supabase.storage
      .from(bucket)
      .upload(objectPath, image, { upsert: true })
      .then(({ error }) => {
        if (error) {
          console.error(error);
          reject(`Failed to upload ${image.name}.`);
        } else {
          resolve(true);
        }
      });
  });
}

export function deleteImage(path: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const { bucket, objectPath } = parsePath(`${path}/${filename}`);

    supabase.storage
      .from(bucket)
      .remove([objectPath])
      .then(({ error }) => {
        if (error) {
          console.error(error);
          reject(`Failed to delete ${filename}.`);
        } else {
          resolve();
        }
      });
  });
}

export function getImageUrl(fullPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { bucket, objectPath } = parsePath(fullPath);
    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    if (data?.publicUrl) {
      resolve(data.publicUrl);
    } else {
      // For private buckets, fall back to a signed URL
      supabase.storage
        .from(bucket)
        .createSignedUrl(objectPath, 3600)
        .then(({ data: signedData, error }) => {
          if (error || !signedData?.signedUrl) {
            console.error(error);
            reject(error ?? new Error("Failed to get image URL."));
          } else {
            resolve(signedData.signedUrl);
          }
        });
    }
  });
}

export function replaceImage(
  folderPath: string,
  oldImageFilename: string | undefined,
  newImage: File
) {
  return new Promise<void>((resolve, reject) => {
    let deleteImagePromise: Promise<void>;
    if (oldImageFilename) {
      deleteImagePromise = deleteImage(folderPath, oldImageFilename);
    } else {
      deleteImagePromise = Promise.resolve();
    }

    deleteImagePromise
      .then(() => {
        if (newImage) {
          if (newImage.size > MAX_FILE_SIZE) {
            reject(`Image must be smaller than ${MAX_FILE_SIZE_LABEL} in size.`);
            return;
          }

          uploadImage(folderPath, newImage)
            .then(() => resolve())
            .catch((e) => reject(e));
        } else {
          resolve();
        }
      })
      .catch((e) => {
        console.error(e);
        reject(e);
      });
  });
}
