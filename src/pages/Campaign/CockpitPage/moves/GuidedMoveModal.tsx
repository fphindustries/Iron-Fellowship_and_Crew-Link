import { useState, useCallback, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useStore } from "stores/store";
import { MoveRollers } from "components/features/charactersAndCampaigns/LinkedDialog/LinkedDialogContent/MoveDialogContent/MoveRollers";
import { CockpitProposalCard } from "../shared/CockpitProposalCard";
import { useCockpitAiRequest } from "../shared/useCockpitAiRequest";

interface GuidedMoveModalProps {
  open: boolean;
  onClose: () => void;
  intent: string;
  moveName?: string | null;
}

export function GuidedMoveModal({ open, onClose, intent, moveName }: GuidedMoveModalProps) {
  const moveMap = useStore((store) => store.rules.moveMaps.moveMap);
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

  const moveNameLower = moveName?.toLowerCase();
  const move = moveNameLower
    ? Object.values(moveMap).find((m) => m.name.toLowerCase() === moveNameLower)
    : undefined;

  const [step, setStep] = useState<"move" | "outcome">("move");
  const [narrateProposalId, setNarrateProposalId] = useState<string | null>(null);
  const [narrateLoading, setNarrateLoading] = useState(false);

  const narrateProposal = narrateProposalId
    ? (pendingProposals.find((p) => p.id === narrateProposalId) ?? null)
    : null;

  useEffect(() => {
    if (open) {
      setStep("move");
      setNarrateProposalId(null);
      setNarrateLoading(false);
    }
  }, [open]);

  const handleRollComplete = useCallback(() => {
    setStep("outcome");
  }, []);

  const handleAiNarrate = useCallback(async () => {
    setNarrateLoading(true);
    try {
      const proposal = await request("outcomeNarration", intent);
      if (proposal) {
        setNarrateProposalId(proposal.id);
      }
    } finally {
      setNarrateLoading(false);
    }
  }, [intent, request]);

  const handleAccept = useCallback(async () => {
    if (!narrateProposalId || !campaignId) return;
    await updateProposalStatus(campaignId, narrateProposalId, "accepted");
  }, [narrateProposalId, campaignId, updateProposalStatus]);

  const handleDismiss = useCallback(async () => {
    if (!narrateProposalId || !campaignId) return;
    await updateProposalStatus(campaignId, narrateProposalId, "rejected");
    setNarrateProposalId(null);
  }, [narrateProposalId, campaignId, updateProposalStatus]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{step === "move" ? "Make Your Move" : "Outcome"}</DialogTitle>
      <DialogContent dividers>
        {intent && (
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Intent
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: "italic" }}>
              &ldquo;{intent}&rdquo;
            </Typography>
          </Box>
        )}

        {step === "move" && (
          <>
            {move ? (
              <>
                <Typography variant="subtitle2" mb={1.5}>
                  {move.name}
                </Typography>
                <MoveRollers move={move} onRollComplete={handleRollComplete} />
              </>
            ) : (
              <Alert severity="info">
                {moveName
                  ? `Move "${moveName}" not found. Roll manually, then click Continue.`
                  : "No move identified. Roll manually, then click Continue."}
              </Alert>
            )}
          </>
        )}

        {step === "outcome" && (
          <Box>
            {!narrateProposalId && !narrateLoading && (
              <Button
                variant="outlined"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleAiNarrate}
              >
                AI Narrate Outcome
              </Button>
            )}
            {narrateLoading && !narrateProposalId && (
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Narrating outcome…
                </Typography>
              </Box>
            )}
            {narrateProposal && (
              <Box mt={1}>
                <CockpitProposalCard
                  proposal={narrateProposal}
                  onAccept={handleAccept}
                  onDismiss={handleDismiss}
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {step === "move" && !move && (
          <Button onClick={() => setStep("outcome")}>Continue</Button>
        )}
        <Button onClick={onClose} color="inherit">
          {step === "outcome" ? "Done" : "Cancel"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
