import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { AIGuideProposal } from "types/AIGuideState.type";

const MODE_LABELS: Record<string, string> = {
  sceneFrame: "Frame Scene",
  askOrAnswer: "Ask / Answer",
  moveSuggestion: "Suggest Move",
  outcomeNarration: "Narrate Outcome",
  priceProposal: "Pay the Price",
  oracleInterpretation: "Interpret Oracle",
  clockAdvance: "Advance Clock",
  sceneChallengeGuidance: "Scene Challenge",
  bookkeepingProposal: "Bookkeeping",
};

interface CockpitProposalCardProps {
  proposal: AIGuideProposal;
  onAccept: () => void;
  onDismiss: () => void;
}

export function CockpitProposalCard(props: CockpitProposalCardProps) {
  const { proposal, onAccept, onDismiss } = props;

  if (!proposal.content) {
    return (
      <Box
        sx={{
          p: 1.5,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <CircularProgress size={14} />
        <Typography variant="body2" color="text.secondary">
          {MODE_LABELS[proposal.mode]?.toLowerCase() ?? "responding"}…
        </Typography>
      </Box>
    );
  }

  const isPending = proposal.status === "pending";

  return (
    <Box
      sx={{
        p: 1.5,
        border: 1,
        borderColor: isPending ? "primary.light" : "divider",
        borderRadius: 1,
        bgcolor: isPending ? "action.hover" : undefined,
        opacity: proposal.status === "rejected" ? 0.5 : 1,
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
        <Chip
          label={MODE_LABELS[proposal.mode] ?? proposal.mode}
          size="small"
          variant="outlined"
        />
        {!isPending && (
          <Typography variant="caption" color="text.secondary">
            {proposal.status}
          </Typography>
        )}
      </Box>

      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: isPending ? 0.5 : 0 }}>
        {proposal.content}
      </Typography>

      {isPending && (
        <Box display="flex" gap={1} mt={1} flexWrap="wrap">
          <Button size="small" startIcon={<CheckIcon />} onClick={onAccept}>
            Accept
          </Button>
          <Button
            size="small"
            color="inherit"
            startIcon={<CloseIcon />}
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        </Box>
      )}
    </Box>
  );
}
