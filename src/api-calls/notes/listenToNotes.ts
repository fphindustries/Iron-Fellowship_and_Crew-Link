import { supabase } from "config/supabase.config";
import { Note } from "types/Notes.type";
import { NoteSource } from "stores/notes/notes.slice.type";

interface NoteRow {
  id: string;
  title: string;
  order: number;
  shared?: boolean | null;
}

function rowToNote(row: NoteRow): Note {
  return {
    noteId: row.id,
    title: row.title,
    order: row.order,
    shared: row.shared ?? false,
  };
}

export function listenToNotes(
  campaignId: string | undefined,
  characterId: string | undefined,
  onlySharedCampaignNotes: boolean,
  onNotes: (source: NoteSource, notes: Note[]) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void
): () => void {
  if (!campaignId && !characterId) {
    onError("Either character or campaign ID must be defined.");
    return () => {};
  }

  async function fetchCharacterNotes() {
    if (!characterId) return;
    const { data, error } = await supabase
      .from("character_notes")
      .select("*")
      .eq("character_id", characterId);

    if (error) {
      onError(error);
      return;
    }

    const notes: Note[] = ((data ?? []) as NoteRow[])
      .map(rowToNote)
      .sort((n1, n2) => n1.order - n2.order);

    onNotes(NoteSource.Character, notes);
  }

  async function fetchCampaignNotes() {
    if (!campaignId) return;
    let query = supabase
      .from("campaign_notes")
      .select("*")
      .eq("campaign_id", campaignId);

    if (onlySharedCampaignNotes) {
      query = query.eq("shared", true);
    }

    const { data, error } = await query;

    if (error) {
      onError(error);
      return;
    }

    const notes: Note[] = ((data ?? []) as NoteRow[])
      .map(rowToNote)
      .sort((n1, n2) => n1.order - n2.order);

    onNotes(NoteSource.Campaign, notes);
  }

  if (characterId) {
    fetchCharacterNotes().catch(onError);
  }
  if (campaignId) {
    fetchCampaignNotes().catch(onError);
  }

  const unsubscribers: (() => void)[] = [];

  if (characterId) {
    const characterChannel = supabase
      .channel(`character_notes:${characterId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_notes",
          filter: `character_id=eq.${characterId}`,
        },
        () => fetchCharacterNotes().catch(onError)
      )
      .subscribe();

    unsubscribers.push(() => supabase.removeChannel(characterChannel));
  }

  if (campaignId) {
    const campaignChannel = supabase
      .channel(`campaign_notes:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_notes",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => fetchCampaignNotes().catch(onError)
      )
      .subscribe();

    unsubscribers.push(() => supabase.removeChannel(campaignChannel));
  }

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}
