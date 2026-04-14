import { supabase } from "config/supabase.config";
import { convertFromRow, TrackRow } from "./_getRef";
import { Track, TrackSectionTracks } from "types/Track.type";

export function listenToProgressTracks(
  campaignId: string | undefined,
  characterId: string | undefined,
  status: string,
  addOrUpdateTracks: (tracks: { [trackId: string]: Track }) => void,
  removeTrack: (trackId: string, trackType: TrackSectionTracks) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void
): (() => void) | undefined {
  if (!campaignId && !characterId) {
    throw new Error("Must provide either a character or campaign ID.");
  }

  const table = campaignId ? "campaign_tracks" : "character_tracks";
  const column = campaignId ? "campaign_id" : "character_id";
  const id = (campaignId ?? characterId) as string;

  const fetchAll = () =>
    (supabase as any).from(table)
      .select("*")
      .eq(column, id)
      .eq("status", status)
      .then(
        ({
          data,
          error,
        }: {
          data: TrackRow[] | null;
          error: unknown;
        }) => {
          if (error) {
            onError(error);
            return;
          }
          if (data) {
            const updates: { [trackId: string]: Track } = {};
            data.forEach((row) => {
              updates[row.id] = convertFromRow(row);
            });
            addOrUpdateTracks(updates);
          }
        }
      );

  const channel = supabase
    .channel(`${table}:${column}:${id}:status:${status}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `${column}=eq.${id}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        if (payload.eventType === "DELETE") {
          const old = payload.old as TrackRow;
          removeTrack(old.id, old.type as TrackSectionTracks);
        } else {
          const row = payload.new as TrackRow;
          if (row.status === status) {
            addOrUpdateTracks({ [row.id]: convertFromRow(row) });
          } else {
            // Track exists but no longer matches our status filter — treat as removed
            removeTrack(row.id, row.type as TrackSectionTracks);
          }
        }
      }
    )
    .subscribe();

  fetchAll();

  return () => {
    supabase.removeChannel(channel);
  };
}
