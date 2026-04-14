export function constructCampaignNoteCollectionPath(campaignId: string) {
  return `/campaigns/${campaignId}/notes`;
}

export function constructCampaignNoteDocPath(
  campaignId: string,
  noteId: string
) {
  return `/campaigns/${campaignId}/notes/${noteId}`;
}

export function constructCampaignNoteContentPath(
  campaignId: string,
  noteId: string
) {
  return `/campaigns/${campaignId}/notes/${noteId}/content/content`;
}

export function constructCharacterNoteCollectionPath(characterId: string) {
  return `/characters/${characterId}/notes`;
}

export function constructCharacterNoteDocPath(
  characterId: string,
  noteId: string
) {
  return `/characters/${characterId}/notes/${noteId}`;
}

export function constructCharacterNoteContentPath(
  characterId: string,
  noteId: string
) {
  return `/characters/${characterId}/notes/${noteId}/content/content`;
}
