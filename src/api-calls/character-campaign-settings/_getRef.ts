export function constructCampaignSettingsDocPath(campaignId: string) {
  return `/campaigns/${campaignId}/settings/settings`;
}

export function constructCharacterSettingsDocPath(characterId: string) {
  return `/characters/${characterId}/settings/settings`;
}

// Legacy stubs retained for call sites not yet migrated to Supabase.
// TODO: Remove once all callers are migrated.
export function getCampaignSettingsDoc(_campaignId: string) {
  return constructCampaignSettingsDocPath(_campaignId) as unknown;
}

export function getCharacterSettingsDoc(_characterId: string) {
  return constructCharacterSettingsDocPath(_characterId) as unknown;
}
