import {
  Box,
  Breadcrumbs,
  Checkbox,
  FormControlLabel,
  Link,
  Typography,
} from "@mui/material";
import { NoteSidebar } from "./NoteSidebar";
import { NoteSource, ROLL_LOG_ID } from "stores/notes/notes.slice.type";
import { GameLog } from "components/features/charactersAndCampaigns/GameLog";
import { RtcRichTextEditor } from "components/shared/RichTextEditor/RtcRichTextEditor";
import { useCallback } from "react";
import { useStore } from "stores/store";
import { useCampaignType } from "hooks/useCampaignType";
import { CampaignType } from "types/Campaign.type";
import { AiTriggerButton } from "components/shared/AiTriggerButton";
import {
  useNoteContentQuery,
  useNotesQuery,
  useRemoveNoteMutation,
  useUpdateNoteContentMutation,
  useUpdateNoteSharedMutation,
} from "hooks/queries/useNotesQuery";

export interface NotesProps {
  hideSidebar?: boolean;
  condensedView?: boolean;
}

export function Notes(props: NotesProps) {
  const { condensedView, hideSidebar } = props;

  const selectedNote = useStore(
    (store) =>
      store.notes.openNote ??
      (condensedView || hideSidebar ? undefined : ROLL_LOG_ID)
  );

  const setSelectedNote = useStore((store) => store.notes.setOpenNoteId);

  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );

  const openNoteEntityType =
    selectedNote && typeof selectedNote !== "string"
      ? selectedNote.source
      : undefined;
  const openNoteEntityId =
    openNoteEntityType === NoteSource.Campaign ? campaignId : characterId;

  const { data: campaignNotes = [] } = useNotesQuery({
    entityType: NoteSource.Campaign,
    entityId: campaignId,
    enabled: !!campaignId,
  });
  const { data: characterNotes = [] } = useNotesQuery({
    entityType: NoteSource.Character,
    entityId: characterId,
    enabled: !!characterId,
  });

  const selectedNoteItem =
    selectedNote && typeof selectedNote !== "string"
      ? (selectedNote.source === NoteSource.Campaign
          ? campaignNotes
          : characterNotes
        ).find((note) => note.noteId === selectedNote.id)
      : undefined;

  const noteContentQuery = useNoteContentQuery({
    noteId:
      selectedNote && typeof selectedNote !== "string"
        ? selectedNote.id
        : undefined,
    entityType: openNoteEntityType,
    entityId: openNoteEntityId,
  });

  const updateNoteContent = useUpdateNoteContentMutation();
  const removeNote = useRemoveNoteMutation(
    openNoteEntityType ?? NoteSource.Character,
    openNoteEntityId
  );
  const updateNoteShared = useUpdateNoteSharedMutation(
    openNoteEntityType ?? NoteSource.Character,
    openNoteEntityId
  );

  const saveCallback = useCallback(
    (
      unparsedId: string,
      notes: Uint8Array,
      isBeaconRequest?: boolean,
      title?: string
    ) => {
      const note = parseId(unparsedId);
      return updateNoteContent.mutateAsync({
        noteId: note.id,
        title: title ?? "Note",
        content: notes,
        isBeaconRequest,
      });
    },
    [updateNoteContent]
  );

  const handleDelete = useCallback(
    (unparsedId: string) => {
      const { id } = parseId(unparsedId);
      removeNote.mutateAsync(id).then(() => {
        setSelectedNote();
      });
    },
    [removeNote, setSelectedNote]
  );

  const roomPrefix =
    selectedNote && typeof selectedNote !== "string"
      ? selectedNote.source === NoteSource.Character
        ? `characters-${characterId}-`
        : `campaigns-${campaignId}-`
      : "";
  const roomPassword =
    selectedNote && typeof selectedNote !== "string"
      ? selectedNote.source === NoteSource.Character
        ? characterId
        : campaignId
      : "";

  const { showGuidedPlayerView, campaignType } = useCampaignType();

  const contentReady =
    selectedNote &&
    typeof selectedNote !== "string" &&
    !noteContentQuery.isPending;

  return (
    <Box
      height={condensedView && selectedNote === ROLL_LOG_ID ? "70vh" : "100%"}
      minHeight={"50vh"}
      display={"flex"}
      width={"100%"}
    >
      {((!hideSidebar && !condensedView) || !selectedNote) && (
        <NoteSidebar
          selectedNote={selectedNote}
          isMobile={condensedView ?? false}
        />
      )}
      {(!condensedView || selectedNote) && (
        <Box
          flexGrow={1}
          flexShrink={0}
          width={0}
          minHeight={"100%"}
          display={"flex"}
          flexDirection={"column"}
          sx={{ overflowY: "auto" }}
        >
          {(condensedView || hideSidebar) &&
            (selectedNote || selectedNote === ROLL_LOG_ID) && (
              <Breadcrumbs aria-label="breadcrumb" sx={{ px: 2, py: 1 }}>
                <Link
                  underline="hover"
                  color="inherit"
                  onClick={() => setSelectedNote()}
                  sx={{ cursor: "pointer" }}
                >
                  Notes
                </Link>
                <Typography color="text.primary">
                  {selectedNote === ROLL_LOG_ID
                    ? "Roll Log"
                    : selectedNoteItem?.title ?? ""}
                </Typography>
              </Breadcrumbs>
            )}
          {selectedNote === ROLL_LOG_ID && (
            <>
              <Box
                display="flex"
                justifyContent="flex-end"
                px={1}
                pt={0.5}
              >
                <AiTriggerButton
                  mode="sessionRecap"
                  tooltip="Generate session recap with AI Guide"
                />
              </Box>
              <GameLog />
            </>
          )}
          {contentReady && (
            <RtcRichTextEditor
              roomPrefix={roomPrefix}
              documentPassword={roomPassword ?? ""}
              id={constructId(
                (selectedNote as { source: NoteSource; id: string }).source,
                (selectedNote as { source: NoteSource; id: string }).id
              )}
              initialValue={noteContentQuery.data ?? undefined}
              showTitle
              onSave={saveCallback}
              onDelete={handleDelete}
              extraEditorActions={
                <>
                  <AiTriggerButton
                    mode="sessionRecap"
                    tooltip="Generate session recap with AI Guide"
                  />
                  {selectedNote &&
                  typeof selectedNote !== "string" &&
                  selectedNote.source === NoteSource.Campaign &&
                  campaignType === CampaignType.Guided &&
                  !showGuidedPlayerView ? (
                    <FormControlLabel
                      label={"Shared"}
                      sx={{ px: 1 }}
                      control={
                        <Checkbox
                          checked={selectedNoteItem?.shared ?? false}
                          onChange={(_, checked) =>
                            updateNoteShared
                              .mutate({
                                noteId: (
                                  selectedNote as { id: string }
                                ).id,
                                shared: checked,
                              })
                          }
                        />
                      }
                    />
                  ) : null}
                </>
              }
            />
          )}
        </Box>
      )}
    </Box>
  );
}

function constructId(source: NoteSource, id: string) {
  return `${source}-${id}`;
}

function parseId(id: string) {
  const split = id.split("-");
  return {
    source: split[0] as NoteSource,
    id: split[1],
  };
}
