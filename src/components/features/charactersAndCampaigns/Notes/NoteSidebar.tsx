import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { NoteSource, ROLL_LOG_ID } from "stores/notes/notes.slice.type";
import DieIcon from "@mui/icons-material/Casino";
import { useStore } from "stores/store";
import { NoteSidebarSection } from "./NoteSidebarSection";
import { useNotesQuery } from "hooks/queries/useNotesQuery";
import { CampaignType } from "types/Campaign.type";

export interface NoteSidebarProps {
  selectedNote?: typeof ROLL_LOG_ID | { source: NoteSource; id: string };
  isMobile: boolean;
}

export function NoteSidebar(props: NoteSidebarProps) {
  const { selectedNote, isMobile } = props;

  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const showAllCampaignDocs = useStore((store) => {
    const isGuidedCampaign =
      (store.campaigns.currentCampaign.currentCampaign?.type ??
        CampaignType.Guided) === CampaignType.Guided;
    const isGM = store.campaigns.currentCampaign.currentCampaign?.gmIds?.includes(
      store.auth.uid
    );
    return !isGuidedCampaign || isGM || false;
  });

  const { data: campaignNotes = [] } = useNotesQuery({
    entityType: NoteSource.Campaign,
    entityId: campaignId,
    enabled: !!campaignId && showAllCampaignDocs,
  });

  const { data: characterNotes = [] } = useNotesQuery({
    entityType: NoteSource.Character,
    entityId: characterId,
    enabled: !!characterId,
  });

  const setOpenNote = useStore((store) => store.notes.setOpenNoteId);

  return (
    <Box
      sx={(theme) => ({
        bgcolor: theme.palette.background.paperInlay,
      })}
      width={isMobile ? "100%" : "33%"}
      maxWidth={isMobile ? undefined : "250px"}
      display={"flex"}
      flexDirection={"column"}
    >
      <List sx={{ overflowY: "auto" }}>
        <ListItemButton
          selected={ROLL_LOG_ID === selectedNote}
          onClick={() => setOpenNote(ROLL_LOG_ID)}
        >
          <ListItemIcon>
            <DieIcon />
          </ListItemIcon>
          <ListItemText>Roll Log</ListItemText>
        </ListItemButton>

        {campaignId && showAllCampaignDocs && (
          <NoteSidebarSection
            notes={campaignNotes}
            openNote={selectedNote}
            noteSource={NoteSource.Campaign}
          />
        )}
        {characterId && (
          <NoteSidebarSection
            notes={characterNotes}
            openNote={selectedNote}
            noteSource={NoteSource.Character}
          />
        )}
      </List>
    </Box>
  );
}
