// Supabase migration: Firestore refs replaced with table name constants.

export const WORLD_TABLE = "worlds";

export function decodeWorld(row: {
  id: string;
  name: string;
  setting_key: string;
  description?: string | null;
  new_truths?: Record<string, unknown> | null;
  owner_ids: string[];
  campaign_guides?: string[] | null;
}) {
  const { owner_ids, campaign_guides, new_truths, description, ...rest } = row;

  // Merge owner_ids and campaign_guides into a single ownerIds array (same as
  // the previous Firestore decodeWorld), but also preserve campaignGuides.
  const ownerIds = [...owner_ids, ...(campaign_guides ?? [])];

  return {
    ...rest,
    settingKey: row.setting_key,
    ownerIds,
    campaignGuides: campaign_guides ?? undefined,
    newTruths: new_truths ?? undefined,
    worldDescription: description
      ? Uint8Array.from(atob(description), (c) => c.charCodeAt(0))
      : undefined,
  };
}

export function encodeWorldDescription(description: Uint8Array): string {
  return btoa(String.fromCharCode(...description));
}
