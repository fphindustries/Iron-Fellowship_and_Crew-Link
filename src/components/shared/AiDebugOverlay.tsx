import {
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import BugReportIcon from "@mui/icons-material/BugReport";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useState } from "react";
import { useAiDebugStore, AiDebugEntry } from "stores/aiDebug";

function EntryRow({ entry }: { entry: AiDebugEntry }) {
  const [expanded, setExpanded] = useState(false);
  const json = JSON.stringify(entry.payload, null, 2);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(json);
  };

  return (
    <Box border={1} borderColor="divider" borderRadius={1} mb={1}>
      <ListItemButton
        onClick={() => setExpanded((v) => !v)}
        sx={{ borderRadius: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={1} flexGrow={1}>
          <Chip label={entry.label} size="small" color="primary" variant="outlined" />
          <Typography variant="caption" color="text.secondary">
            {entry.timestamp.toLocaleTimeString()}
          </Typography>
        </Stack>
        <Tooltip title="Copy JSON">
          <IconButton size="small" onClick={handleCopy}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {expanded ? (
          <ExpandLessIcon fontSize="small" />
        ) : (
          <ExpandMoreIcon fontSize="small" />
        )}
      </ListItemButton>
      <Collapse in={expanded}>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1.5,
            fontSize: "0.75rem",
            overflowX: "auto",
            bgcolor: "background.paperInlay",
            borderTop: 1,
            borderColor: "divider",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {json}
        </Box>
      </Collapse>
    </Box>
  );
}

export function AiDebugOverlay() {
  const [open, setOpen] = useState(false);
  const entries = useAiDebugStore((s) => s.entries);
  const clear = useAiDebugStore((s) => s.clear);

  return (
    <>
      <Tooltip title="AI Debug — view recent AI payloads">
        <Badge
          badgeContent={entries.length}
          color="warning"
          overlap="circular"
          sx={{ position: "fixed", bottom: 72, right: 16, zIndex: 1300 }}
        >
          <IconButton
            onClick={() => setOpen(true)}
            size="small"
            sx={{
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <BugReportIcon fontSize="small" />
          </IconButton>
        </Badge>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: "80vh" } }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">AI Debug — Request Payloads</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={clear} disabled={entries.length === 0}>
                Clear
              </Button>
              <IconButton size="small" onClick={() => setOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No AI calls recorded yet. Make an AI request and it will appear here.
            </Typography>
          ) : (
            <List disablePadding>
              {entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
