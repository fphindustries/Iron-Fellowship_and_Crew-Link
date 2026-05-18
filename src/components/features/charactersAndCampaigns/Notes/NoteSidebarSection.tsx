import {
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
} from "@mui/material";
import { useCampaignType } from "hooks/useCampaignType";
import { DragDropContext, Draggable, DropResult } from "@hello-pangea/dnd";
import { NoteSource, ROLL_LOG_ID } from "stores/notes/notes.slice.type";
import { useStore } from "stores/store";
import { Note } from "types/Notes.type";
import { StrictModeDroppable } from "./StrictModeDroppable";
import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { ignoreApiError } from "config/api.config";
import {
  useAddNoteMutation,
  useUpdateNoteOrderMutation,
} from "hooks/queries/useNotesQuery";

export interface NoteSidebarSectionProps {
  notes: Note[];
  openNote?: typeof ROLL_LOG_ID | { source: NoteSource; id: string };
  noteSource: NoteSource;
}

export function NoteSidebarSection(props: NoteSidebarSectionProps) {
  const { notes, openNote, noteSource } = props;

  const { showGuidedPlayerView, showGuideTips } = useCampaignType();

  const setOpenNote = useStore((store) => store.notes.setOpenNoteId);

  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );

  const entityId =
    noteSource === NoteSource.Campaign ? campaignId : characterId;

  const addNote = useAddNoteMutation(noteSource, entityId);
  const updateNoteOrder = useUpdateNoteOrderMutation(noteSource, entityId);

  const handleDragEnd = (evt: DropResult) => {
    const { source, destination } = evt;
    if (!destination) return;

    let noteBefore: Note | undefined;
    let noteAfter: Note | undefined;

    if (source.index === destination.index) {
      return;
    } else if (source.index < destination.index) {
      noteBefore = notes[destination.index];
      noteAfter =
        destination.index + 1 < notes.length
          ? notes[destination.index + 1]
          : undefined;
    } else {
      noteBefore =
        destination.index - 1 >= 0 ? notes[destination.index - 1] : undefined;
      noteAfter = notes[destination.index];
    }
    const noteId = notes[source.index].noteId;

    let order = 1;
    if (noteBefore && noteAfter) {
      order = (noteBefore.order + noteAfter.order) / 2;
    } else if (noteBefore) {
      order = noteBefore.order + 1;
    } else if (noteAfter) {
      order = noteAfter.order - 1;
    }

    updateNoteOrder.mutate({ noteId, order });
  };

  const [loading, setLoading] = useState<boolean>(false);

  const handleCreateNote = () => {
    setLoading(true);
    addNote
      .mutateAsync({
        title: "",
        sortOrder: notes.length > 0 ? notes[notes.length - 1].order + 1 : 1,
        shared:
          noteSource === NoteSource.Campaign && showGuidedPlayerView
            ? true
            : false,
      })
      .then((noteId) => {
        setOpenNote({ source: noteSource, id: noteId });
      })
      .catch(ignoreApiError)
      .finally(() => {
        setLoading(false);
      });
  };

  const sectionHeader = (
    <>
      <Divider />
      <ListItem sx={{ bgcolor: "background.paperInlayDarker" }}>
        <ListItemText
          primary={
            noteSource === NoteSource.Campaign
              ? "Campaign Notes"
              : "Character Notes"
          }
        />
        <ListItemSecondaryAction>
          <IconButton
            aria-label={"Add Note"}
            disabled={loading}
            onClick={handleCreateNote}
          >
            <AddIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    </>
  );

  const canDrag = noteSource === NoteSource.Character || !showGuidedPlayerView;
  if (canDrag) {
    return (
      <>
        {sectionHeader}
        <DragDropContext onDragEnd={handleDragEnd}>
          <StrictModeDroppable droppableId={`notes-sidebar-list-${noteSource}`}>
            {(provided) => (
              <List {...provided.droppableProps} ref={provided.innerRef}>
                {notes.map((note, index) => (
                  <Draggable
                    key={note.noteId}
                    draggableId={note.noteId}
                    index={index}
                    isDragDisabled={false}
                  >
                    {(provided) => (
                      <ListItem
                        disablePadding
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={provided.draggableProps.style}
                      >
                        <ListItemButton
                          selected={
                            openNote &&
                            typeof openNote !== "string" &&
                            note.noteId === openNote.id
                          }
                          onClick={() =>
                            setOpenNote({ source: noteSource, id: note.noteId })
                          }
                        >
                          <ListItemText
                            primaryTypographyProps={{
                              sx: {
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              },
                            }}
                            primary={note.title}
                            secondary={
                              showGuideTips
                                ? note.shared
                                  ? "Shared"
                                  : "Private"
                                : undefined
                            }
                          >
                            {note.title}
                          </ListItemText>
                        </ListItemButton>
                      </ListItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </List>
            )}
          </StrictModeDroppable>
        </DragDropContext>
      </>
    );
  }

  return (
    <>
      {sectionHeader}
      <List>
        {notes.map((note, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton
              selected={
                openNote &&
                typeof openNote !== "string" &&
                note.noteId === openNote.id
              }
              onClick={() =>
                setOpenNote({ source: noteSource, id: note.noteId })
              }
            >
              <ListItemText
                primaryTypographyProps={{
                  sx: {
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                }}
              >
                {note.title}
              </ListItemText>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
}
