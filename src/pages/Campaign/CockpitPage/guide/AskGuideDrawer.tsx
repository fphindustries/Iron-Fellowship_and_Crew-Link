import { useState, useCallback } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { useStore } from "stores/store";
import { CockpitProposalCard } from "../shared/CockpitProposalCard";
import { useCockpitAiRequest } from "../shared/useCockpitAiRequest";
import { AIGuideProposal } from "types/AIGuideState.type";

interface AskGuideDrawerProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS: { label: string; mode: "askOrAnswer" | "moveSuggestion" | "actionSuggestions" | "bookkeepingProposal"; freeform?: string }[] = [
  { label: "What is happening?", mode: "askOrAnswer", freeform: "Describe what is currently happening in the scene and what the most significant threats or opportunities are." },
  { label: "What are my options?", mode: "actionSuggestions" },
  { label: "What move applies?", mode: "moveSuggestion" },
  { label: "Bookkeep session", mode: "bookkeepingProposal" },
];

const GUIDE_RESPONSE_MODES = new Set([
  "askOrAnswer",
  "moveSuggestion",
  "actionSuggestions",
  "bookkeepingProposal",
  "outcomeNarration",
  "oracleInterpretation",
  "priceProposal",
  "sceneChallengeGuidance",
]);

export function AskGuideDrawer({ open, onClose }: AskGuideDrawerProps) {
  const { request } = useCockpitAiRequest();
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const updateProposalStatus = useStore(
    (store) => store.aiGuide.updateProposalStatus
  );
  const pendingProposals = useStore(
    (store) => store.aiGuide.state?.pendingProposals ?? []
  );

  const [freeform, setFreeform] = useState("");
  const [loading, setLoading] = useState(false);

  const drawerProposals = pendingProposals.filter(
    (p) => GUIDE_RESPONSE_MODES.has(p.mode) && p.status !== "rejected"
  );

  const handleQuickPrompt = useCallback(
    async (mode: "askOrAnswer" | "moveSuggestion" | "actionSuggestions" | "bookkeepingProposal", freeformInput?: string) => {
      setLoading(true);
      try {
        await request(mode, freeformInput);
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const handleAsk = useCallback(async () => {
    if (!freeform.trim()) return;
    const text = freeform.trim();
    setFreeform("");
    setLoading(true);
    try {
      await request("askOrAnswer", text);
    } finally {
      setLoading(false);
    }
  }, [freeform, request]);

  const handleAccept = useCallback(
    async (proposal: AIGuideProposal) => {
      if (!campaignId) return;
      await updateProposalStatus(campaignId, proposal.id, "accepted");
    },
    [campaignId, updateProposalStatus]
  );

  const handleDismiss = useCallback(
    async (proposal: AIGuideProposal) => {
      if (!campaignId) return;
      await updateProposalStatus(campaignId, proposal.id, "rejected");
    },
    [campaignId, updateProposalStatus]
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 360, maxWidth: "100vw", display: "flex", flexDirection: "column" } }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1.5,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6" sx={{ flex: 1 }}>
          Ask Guide
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Quick prompts */}
      <Box sx={{ p: 1.5, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          Quick Prompts
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={0.75}>
          {QUICK_PROMPTS.map((qp) => (
            <Chip
              key={qp.label}
              label={qp.label}
              size="small"
              clickable
              disabled={loading}
              onClick={() => handleQuickPrompt(qp.mode, qp.freeform)}
            />
          ))}
        </Box>
      </Box>

      {/* Responses */}
      <Box sx={{ flex: 1, overflow: "auto", p: 1.5 }}>
        {drawerProposals.length === 0 && !loading && (
          <Typography variant="body2" color="text.disabled" textAlign="center" mt={2}>
            Ask the guide anything about the current scene.
          </Typography>
        )}

        {loading && (
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Guide is thinking…
            </Typography>
          </Box>
        )}

        <Stack spacing={1.5} mt={drawerProposals.length > 0 ? 0 : 1}>
          {drawerProposals.map((proposal) => (
            <Box key={proposal.id}>
              <CockpitProposalCard
                proposal={proposal}
                onAccept={() => handleAccept(proposal)}
                onDismiss={() => handleDismiss(proposal)}
              />
            </Box>
          ))}
        </Stack>
      </Box>

      <Divider />

      {/* Free-form input */}
      <Box sx={{ p: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          multiline
          maxRows={4}
          placeholder="Ask the guide…"
          value={freeform}
          onChange={(e) => setFreeform(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Ask">
                  <span>
                    <IconButton
                      size="small"
                      disabled={!freeform.trim() || loading}
                      onClick={handleAsk}
                    >
                      <SendIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Drawer>
  );
}
