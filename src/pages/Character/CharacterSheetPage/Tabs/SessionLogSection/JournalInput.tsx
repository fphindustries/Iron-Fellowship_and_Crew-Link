import { useState } from "react";
import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useStore } from "stores/store";

export interface JournalInputProps {
  onRequestGuide: (prompt: string) => void;
  guideIsStreaming: boolean;
}

export function JournalInput({ onRequestGuide, guideIsStreaming }: JournalInputProps) {
  const [text, setText] = useState("");
  const logJournalEvent = useStore(
    (store) => store.sessionLog.logJournalEvent
  );

  const trimmed = text.trim();

  const handleSubmit = () => {
    if (!trimmed) return;
    logJournalEvent(trimmed);
    setText("");
  };

  const handleGuide = () => {
    if (!trimmed || guideIsStreaming) return;
    onRequestGuide(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box display="flex" alignItems="center" gap={0.5} px={2} py={1}>
      <TextField
        fullWidth
        size="small"
        placeholder="Write a note or ask the Guide..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Tooltip title="Save as journal entry">
        <span>
          <IconButton
            color="primary"
            onClick={handleSubmit}
            disabled={!trimmed}
          >
            <SendIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Ask the Guide to narrate this">
        <span>
          <IconButton
            color="secondary"
            onClick={handleGuide}
            disabled={!trimmed || guideIsStreaming}
          >
            <AutoAwesomeIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
