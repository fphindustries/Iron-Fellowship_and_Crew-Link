import { api } from "../config/api.config";

export const MAX_FILE_SIZE = 2 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = "2 MB";

export async function uploadImage(path: string, image: File): Promise<boolean> {
  const key = `${path}/${image.name}`;
  const { uploadUrl, fields } = await api.post<{ uploadUrl: string; fields: Record<string, string>; key: string }>(
    "/api/storage/upload-url",
    { key, contentType: image.type }
  );
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  formData.append("file", image);
  const res = await fetch(uploadUrl, { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Failed to upload ${image.name}.`);
  return true;
}

export async function deleteImage(path: string, filename: string): Promise<void> {
  await api.del("/api/storage/objects", { key: `${path}/${filename}` });
}

export async function getImageUrl(key: string): Promise<string> {
  const { url } = await api.get<{ url: string }>(
    `/api/storage/url?key=${encodeURIComponent(key)}`
  );
  return url;
}

export async function replaceImage(
  folderPath: string,
  oldImageFilename: string | undefined,
  newImage: File
): Promise<void> {
  if (newImage.size > MAX_FILE_SIZE) {
    throw new Error(`Image must be smaller than ${MAX_FILE_SIZE_LABEL} in size.`);
  }
  if (oldImageFilename) {
    await deleteImage(folderPath, oldImageFilename);
  }
  await uploadImage(folderPath, newImage);
}
