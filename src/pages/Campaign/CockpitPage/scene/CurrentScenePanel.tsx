import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import EditIcon from "@mui/icons-material/Edit";
import { useState } from "react";
import { useStore } from "stores/store";
import { CockpitProposalCard } from "../shared/CockpitProposalCard";
import { useCockpitAiRequest } from "../shared/useCockpitAiRequest";
import { MarkdownRenderer } from "components/shared/MarkdownRenderer/MarkdownRenderer";

export function CurrentScenePanel() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const scene = useStore((store) => store.aiGuide.state?.currentScene);
  const isLoading = useStore((store) => store.aiGuide.isLoading);
  const isRequesting = useStore((store) => store.ai.isRequesting);
  const activeRequestMode = useStore((store) => store.ai.activeRequestMode);

  // Pending sceneFrame proposals
  const sceneProposals = useStore(
    (store) =>
      store.aiGuide.state?.pendingProposals.filter(
        (p) => p.mode === "sceneFrame" && p.status === "pending"
      ) ?? []
  );

  const updateScene = useStore((store) => store.aiGuide.updateScene);
  const updateProposalStatus = useStore(
    (store) => store.aiGuide.updateProposalStatus
  );

  const { request } = useCockpitAiRequest();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [freeformInput, setFreeformInput] = useState("");
  const [showInput, setShowInput] = useState(false);

  const isFraming =
    isRequesting && activeRequestMode === "sceneFrame";

  const handleFrameScene = async () => {
    setShowInput(false);
    await request("sceneFrame", freeformInput || undefined);
    setFreeformInput("");
  };

  const handleAcceptSceneFrame = async (proposalId: string, content: string) => {
    if (!campaignId) return;
    // Use first line as title if current title is empty
    const firstLine = content.split("\n")[0].replace(/^#+\s*/, "").trim();
    const newTitle =
      scene?.title || firstLine.slice(0, 80) || "Current Scene";
    await updateScene(campaignId, {
      description: content,
      title: newTitle,
    });
    await updateProposalStatus(campaignId, proposalId, "accepted");
  };

  const handleDismissProposal = async (proposalId: string) => {
    if (!campaignId) return;
    await updateProposalStatus(campaignId, proposalId, "rejected");
  };

  const handleSaveTitle = async () => {
    if (!campaignId || !titleDraft.trim()) return;
    await updateScene(campaignId, { title: titleDraft.trim() });
    setEditingTitle(false);
    setTitleDraft("");
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="rectangular" height={80} />
      </Box>
    );
  }

  const hasScene = !!(scene?.title || scene?.description);

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* Scene title */}
      {editingTitle ? (
        <Stack direction="row" gap={1} alignItems="center">
          <TextField
            size="small"
            autoFocus
            fullWidth
            value={titleDraft}
            placeholder="Scene title…"
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
              if (e.key === "Escape") setEditingTitle(false);
            }}
          />
          <Button size="small" onClick={handleSaveTitle}>
            Save
          </Button>
          <Button size="small" color="inherit" onClick={() => setEditingTitle(false)}>
            Cancel
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" alignItems="center" gap={0.5}>
          {scene?.title ? (
            <Typography variant="h6" fontWeight="bold" flex={1}>
              {scene.title}
            </Typography>
          ) : (
            <Typography
              variant="h6"
              color="text.disabled"
              fontStyle="italic"
              flex={1}
            >
              No scene framed
            </Typography>
          )}
          <Button
            size="small"
            color="inherit"
            startIcon={<EditIcon sx={{ fontSize: 14 }} />}
            sx={{ opacity: 0.5, minWidth: "auto", px: 0.5 }}
            onClick={() => {
              setTitleDraft(scene?.title ?? "");
              setEditingTitle(true);
            }}
          >
            Edit
          </Button>
        </Stack>
      )}

      {/* Scene description */}
      {scene?.description && (
        <MarkdownRenderer markdown={scene.description} typographyVariant="body1" />
      )}

      {/* Unresolved questions */}
      {scene?.unresolvedQuestions && scene.unresolvedQuestions.length > 0 && (
        <Box>
          <Typography
            variant="overline"
            color="text.secondary"
            display="block"
            gutterBottom
          >
            Open Questions
          </Typography>
          {scene.unresolvedQuestions.map((q, i) => (
            <Typography key={i} variant="body2" color="text.secondary">
              • {q}
            </Typography>
          ))}
        </Box>
      )}

      {/* Pending sceneFrame proposals */}
      {sceneProposals.length > 0 && (
        <>
          <Divider />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {sceneProposals.map((proposal) => (
              <CockpitProposalCard
                key={proposal.id}
                proposal={proposal}
                onAccept={() => handleAcceptSceneFrame(proposal.id, proposal.content)}
                onDismiss={() => handleDismissProposal(proposal.id)}
              />
            ))}
          </Box>
        </>
      )}

      {/* Frame Scene controls */}
      <Box>
        {!hasScene && !showInput && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, fontStyle: "italic" }}
          >
            Use the Guide to frame your opening scene, or set a title yourself.
          </Typography>
        )}

        {showInput && (
          <Stack gap={1} sx={{ mb: 1 }}>
            <TextField
              size="small"
              multiline
              fullWidth
              rows={2}
              placeholder="Optional context for the Guide (location, mood, who is present…)"
              value={freeformInput}
              onChange={(e) => setFreeformInput(e.target.value)}
              autoFocus
            />
          </Stack>
        )}

        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            startIcon={
              isFraming ? (
                <CircularProgress size={14} />
              ) : (
                <AutoFixHighIcon sx={{ fontSize: 16 }} />
              )
            }
            disabled={isFraming}
            onClick={showInput ? handleFrameScene : () => setShowInput(true)}
          >
            {isFraming
              ? "Framing…"
              : showInput
              ? "Frame Scene"
              : "Ask Guide to Frame Scene"}
          </Button>
          {showInput && (
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                setShowInput(false);
                setFreeformInput("");
              }}
            >
              Cancel
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
