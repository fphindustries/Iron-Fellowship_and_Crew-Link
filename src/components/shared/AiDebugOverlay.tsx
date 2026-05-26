import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import BugReportIcon from "@mui/icons-material/BugReport";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SendIcon from "@mui/icons-material/Send";
import { useState } from "react";
import { useAiDebugStore, AiDebugEntry } from "stores/aiDebug";
import {
  GUIDE_ROLE_BLOCK,
  GUIDE_DEFAULT_MODEL,
  GUIDE_DEFAULT_MAX_TOKENS,
} from "hooks/useAIGuide";
import { streamNarrative } from "api-calls/ai/streamNarrative";
import { useStore } from "stores/store";
import { NarrativeRequestPayload } from "types/aiGuide.types";

const AVAILABLE_MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { id: "claude-opus-4-6", label: "Opus 4.6" },
];

// ── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({ entry, onLoadIntoCompose }: { entry: AiDebugEntry; onLoadIntoCompose: (entry: AiDebugEntry) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const json = JSON.stringify(entry.payload, null, 2);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(json);
  };

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entry.fullPrompt) return;
    const text = [
      "=== SYSTEM (Block 1) ===",
      entry.fullPrompt.systemBlocks[0] ?? "",
      "\n=== SYSTEM (Block 2) ===",
      entry.fullPrompt.systemBlocks[1] ?? "",
      "\n=== USER ===",
      entry.fullPrompt.userMessage,
      `\nModel: ${entry.fullPrompt.model}  MaxTokens: ${entry.fullPrompt.maxTokens}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <Box border={1} borderColor="divider" borderRadius={1} mb={1}>
      <ListItemButton onClick={() => setExpanded((v) => !v)} sx={{ borderRadius: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} flexGrow={1}>
          <Chip label={entry.label} size="small" color="primary" variant="outlined" />
          <Typography variant="caption" color="text.secondary">
            {entry.timestamp.toLocaleTimeString()}
          </Typography>
          {entry.fullPrompt && (
            <Chip label="prompt logged" size="small" color="success" variant="outlined" />
          )}
        </Stack>
        <Tooltip title="Copy payload JSON">
          <IconButton size="small" onClick={handleCopy}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ListItemButton>

      <Collapse in={expanded}>
        {/* Prompt view */}
        {entry.fullPrompt && (
          <Box borderTop={1} borderColor="divider">
            <ListItemButton
              onClick={() => setPromptExpanded((v) => !v)}
              sx={{ py: 0.5, px: 1.5 }}
            >
              <Typography variant="caption" color="success.main" flexGrow={1}>
                View full prompt
              </Typography>
              <Tooltip title="Copy full prompt text">
                <IconButton size="small" onClick={handleCopyPrompt}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Load into Compose">
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  sx={{ fontSize: "0.7rem", py: 0, mr: 0.5 }}
                  onClick={(e) => { e.stopPropagation(); onLoadIntoCompose(entry); }}
                >
                  Load in Compose
                </Button>
              </Tooltip>
              {promptExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </ListItemButton>
            <Collapse in={promptExpanded}>
              <Box sx={{ px: 1.5, pb: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  Model: {entry.fullPrompt.model} — Max Tokens: {entry.fullPrompt.maxTokens}
                </Typography>
                {entry.fullPrompt.systemBlocks.map((block, i) => (
                  <Box key={i} mt={1}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
                      System block {i + 1}:
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        m: 0, p: 1, fontSize: "0.7rem", overflowX: "auto",
                        bgcolor: "background.paperInlay", borderRadius: 1,
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                        border: 1, borderColor: "divider",
                      }}
                    >
                      {block}
                    </Box>
                  </Box>
                ))}
                <Box mt={1}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
                    User message:
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      m: 0, p: 1, fontSize: "0.7rem", overflowX: "auto",
                      bgcolor: "background.paperInlay", borderRadius: 1,
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      border: 1, borderColor: "divider",
                    }}
                  >
                    {entry.fullPrompt.userMessage}
                  </Box>
                </Box>
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Payload JSON */}
        <Box
          component="pre"
          sx={{
            m: 0, p: 1.5, fontSize: "0.75rem", overflowX: "auto",
            bgcolor: "background.paperInlay",
            borderTop: 1, borderColor: "divider",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}
        >
          {json}
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Compose pane ─────────────────────────────────────────────────────────────

function ComposePane({ initialEntry }: { initialEntry?: AiDebugEntry }) {
  const activeSessionId = useStore((s) => s.sessionLog.activeSessionId);
  const characterId = useStore((s) => s.characters.currentCharacter.currentCharacterId);
  const campaignId = useStore((s) => s.campaigns.currentCampaign.currentCampaignId);

  const [systemPrompt, setSystemPrompt] = useState(
    initialEntry?.fullPrompt?.systemBlocks.join("\n\n---\n\n") ?? GUIDE_ROLE_BLOCK
  );
  const [userMessage, setUserMessage] = useState(
    initialEntry?.fullPrompt?.userMessage ?? ""
  );
  const [model, setModel] = useState(
    initialEntry?.fullPrompt?.model ?? GUIDE_DEFAULT_MODEL
  );
  const [maxTokens, setMaxTokens] = useState(
    initialEntry?.fullPrompt?.maxTokens ?? GUIDE_DEFAULT_MAX_TOKENS
  );
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!userMessage.trim()) return;
    setSending(true);
    setResponse("");
    setError("");
    try {
      const payload: NarrativeRequestPayload = {
        sessionId: activeSessionId ?? "debug",
        characterId: characterId ?? undefined,
        campaignId: campaignId ?? undefined,
        prompt: "__debug__",
        gameContext: {
          characterName: "Debug",
          worldTruths: [],
          characterAssets: [],
          recentEvents: [],
        },
        debugOverride: {
          systemPrompt,
          userMessage,
          model,
          maxTokens,
        },
      };
      await streamNarrative(payload, (text) => setResponse(text));
    } catch (e) {
      setError(String(e));
    } finally {
      setSending(false);
    }
  };

  const handleCopyResponse = () => navigator.clipboard.writeText(response);

  return (
    <Box display="flex" flexDirection="column" gap={2} pt={1}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Model</InputLabel>
          <Select
            label="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {AVAILABLE_MODELS.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Max tokens"
          type="number"
          size="small"
          value={maxTokens}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v > 0) setMaxTokens(v);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          inputProps={{ min: 1, max: 8192 }}
          sx={{ width: 120 }}
        />
      </Stack>

      <Box>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
          System prompt:
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={5}
          maxRows={12}
          size="small"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          inputProps={{ style: { fontFamily: "monospace", fontSize: "0.75rem" } }}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
          User message:
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={4}
          maxRows={12}
          size="small"
          placeholder="Enter the user message to send…"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          inputProps={{ style: { fontFamily: "monospace", fontSize: "0.75rem" } }}
        />
      </Box>

      <Button
        variant="contained"
        startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
        disabled={sending || !userMessage.trim()}
        onClick={handleSend}
        sx={{ alignSelf: "flex-start" }}
      >
        {sending ? "Sending…" : "Send"}
      </Button>

      {error && (
        <Alert severity="error" sx={{ fontSize: "0.8rem" }}>{error}</Alert>
      )}

      {(response || sending) && (
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              Response:
            </Typography>
            {response && (
              <Tooltip title="Copy response">
                <IconButton size="small" onClick={handleCopyResponse}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Box
            sx={{
              p: 1.5, border: 1, borderColor: "divider", borderRadius: 1,
              bgcolor: "background.paperInlay",
              fontSize: "0.85rem", lineHeight: 1.6,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              minHeight: 80,
            }}
          >
            {response || (
              <Typography variant="caption" color="text.secondary">
                Waiting for response…
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ── Main overlay ─────────────────────────────────────────────────────────────

export function AiDebugOverlay() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [composeKey, setComposeKey] = useState(0);
  const [pendingCompose, setPendingCompose] = useState<AiDebugEntry | undefined>();

  const entries = useAiDebugStore((s) => s.entries);
  const clear = useAiDebugStore((s) => s.clear);
  const logPromptEnabled = useAiDebugStore((s) => s.logPromptEnabled);
  const setLogPromptEnabled = useAiDebugStore((s) => s.setLogPromptEnabled);

  const handleLoadIntoCompose = (entry: AiDebugEntry) => {
    setPendingCompose(entry);
    setTab(1);
    setComposeKey((k) => k + 1);
  };

  return (
    <>
      <Tooltip title="AI Debug">
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
        PaperProps={{ sx: { maxHeight: "85vh", display: "flex", flexDirection: "column" } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">AI Debug</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={logPromptEnabled}
                    onChange={(e) => setLogPromptEnabled(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="caption">Log full prompts</Typography>
                }
                sx={{ mr: 1 }}
              />
              <Button
                size="small"
                onClick={clear}
                disabled={entries.length === 0 || tab !== 0}
              >
                Clear
              </Button>
              <IconButton size="small" onClick={() => setOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 1 }}>
            <Tab label={`Entries (${entries.length})`} />
            <Tab label="Compose" />
          </Tabs>
        </DialogTitle>

        <DialogContent dividers sx={{ flex: 1, overflow: "auto" }}>
          {tab === 0 && (
            <>
              {entries.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                  No AI calls recorded yet. Make an AI request and it will appear here.
                </Typography>
              ) : (
                <List disablePadding>
                  {entries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onLoadIntoCompose={handleLoadIntoCompose}
                    />
                  ))}
                </List>
              )}
            </>
          )}

          {tab === 1 && (
            <ComposePane key={composeKey} initialEntry={pendingCompose} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
