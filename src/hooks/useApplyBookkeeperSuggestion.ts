import { useCallback } from "react";
import { useStore } from "stores/store";
import { BookkeeperApplyPayload } from "stores/ai/ai.slice.type";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { useUpdateCampaignTrackMutation } from "./queries/useCampaignsQuery";
import {
  useCreateNPCMutation,
  useUpdateLocationNotesMutation,
  useUpdateNPCNotesMutation,
} from "./queries/useWorldEntitiesQuery";

export function useApplyBookkeeperSuggestion() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const tracks = useStore((store) => store.campaigns.currentCampaign.tracks);
  const npcs = useStore((store) => store.worlds.currentWorld.currentWorldNPCs);
  const locations = useStore(
    (store) => store.worlds.currentWorld.currentWorldLocations
  );
  const logProgressEvent = useStore(
    (store) => store.sessionLog.logProgressEvent
  );

  const updateCampaignTrack = useUpdateCampaignTrackMutation(campaignId);
  const createNPC = useCreateNPCMutation(worldId);
  const updateNPCNotes = useUpdateNPCNotesMutation(worldId);
  const updateLocationNotes = useUpdateLocationNotesMutation(worldId);

  return useCallback(
    async (payload: BookkeeperApplyPayload) => {
      switch (payload.type) {
        case "vowUpdate": {
          const vowMap = tracks.trackMap[TrackStatus.Active][TrackTypes.Vow];
          const entry = Object.entries(vowMap).find(
            ([, v]) => v.label === payload.data.label
          );
          if (!entry) return;

          const [trackId, track] = entry;
          await updateCampaignTrack.mutateAsync({
            trackId,
            dataJson: {
              ...track,
              value: payload.data.suggestedProgress,
            },
          });
          logProgressEvent({
            trackName: track.label ?? trackId,
            trackType: track.type ?? "",
            previousValue: track.value ?? 0,
            newValue: payload.data.suggestedProgress,
          });
          return;
        }
        case "npcUpdate": {
          const entry = Object.entries(npcs.npcMap).find(
            ([, n]) => n.name === payload.data.name
          );
          if (!entry) return;

          const [npcId, npc] = entry;
          const changes = payload.data.changes;
          const gmProperties: Record<string, string> = {
            ...((npc.gmProperties as Record<string, string> | undefined) ?? {}),
          };
          if (changes.role !== null) gmProperties.role = changes.role;
          if (changes.disposition !== null) {
            gmProperties.disposition = changes.disposition;
          }
          if (changes.goal !== null) gmProperties.goal = changes.goal;
          if (changes.revealedAspect !== null) {
            gmProperties.revealedAspect = changes.revealedAspect;
          }
          await updateNPCNotes.mutateAsync({ npcId, gmProperties });
          return;
        }
        case "newNPC": {
          const row = await createNPC.mutateAsync({ name: payload.data.name });
          const npcId = row.id as string | undefined;
          if (!npcId) return;

          const gmProperties: Record<string, string> = {};
          if (payload.data.role !== null) gmProperties.role = payload.data.role;
          if (payload.data.disposition !== null) {
            gmProperties.disposition = payload.data.disposition;
          }
          if (Object.keys(gmProperties).length > 0) {
            await updateNPCNotes.mutateAsync({ npcId, gmProperties });
          }
          return;
        }
        case "locationUpdate": {
          const entry = Object.entries(locations.locationMap).find(
            ([, l]) => l.name === payload.data.name
          );
          if (!entry) return;

          const [locationId, location] = entry;
          const changes = payload.data.changes;
          const gmProperties: Record<string, string> = {
            ...((location.gmProperties as Record<string, string> | undefined) ??
              {}),
          };
          if (changes.trouble !== null) gmProperties.trouble = changes.trouble;
          await updateLocationNotes.mutateAsync({
            locationId,
            gmProperties,
          });
          return;
        }
      }
    },
    [
      createNPC,
      locations.locationMap,
      logProgressEvent,
      npcs.npcMap,
      tracks.trackMap,
      updateCampaignTrack,
      updateLocationNotes,
      updateNPCNotes,
    ]
  );
}
