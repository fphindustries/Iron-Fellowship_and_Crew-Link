import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useState, useCallback } from "react";
import { useStore } from "stores/store";
import { SuggestedAction, ActionSuggestionsOutput, IntentToMoveOutput } from "types/AI.type";
import { SuggestedActionChips } from "../composer/SuggestedActionChips";
import { MoveMappingPreview } from "../composer/MoveMappingPreview";
import { useCockpitAiRequest } from "../shared/useCockpitAiRequest";
import { GuidedMoveModal } from "../moves/GuidedMoveModal";

export function CockpitComposer() {
  const isRequesting = useStore((store) => store.ai.isRequesting);
  const { request } = useCockpitAiRequest();

  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [freeform, setFreeform] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolvedMove, setResolvedMove] = useState<IntentToMoveOutput | null>(null);
  const [selectedAction, setSelectedAction] = useState<SuggestedAction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIntent, setModalIntent] = useState("");
  const [modalMoveName, setModalMoveName] = useState<string | null>(null);

  const handleGetSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const result = await request("actionSuggestions");
      if (result?.structuredData) {
        const data = result.structuredData as unknown as ActionSuggestionsOutput;
        setSuggestions(data.suggestions ?? []);
      }
    } finally {
      setLoadingSuggestions(false);
    }
  }, [request]);

  const handleSelectSuggestion = (action: SuggestedAction) => {
    setSelectedAction(action);
    setFreeform(action.label);
    setResolvedMove(null);
  };

  const handleResolveIntent = useCallback(async () => {
    if (!freeform.trim()) return;
    setResolving(true);
    setResolvedMove(null);
    setSelectedAction(null);
    try {
      const result = await request("intentToMove", freeform.trim());
      if (result?.structuredData) {
        const data = result.structuredData as unknown as IntentToMoveOutput;
        setResolvedMove(data);
      }
    } finally {
      setResolving(false);
    }
  }, [freeform, request]);

  const handleSubmit = () => {
    setModalIntent(freeform.trim());
    setModalMoveName(resolvedMove?.moveName ?? selectedAction?.moveName ?? null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFreeform("");
    setResolvedMove(null);
    setSelectedAction(null);
  };

  const movePreview = selectedAction
    ? { fromSuggestion: selectedAction }
    : resolvedMove
    ? { fromIntent: resolvedMove }
    : null;

  return (
    <Box>
      <Divider />
      <Box
        sx={{
          p: 1.5,
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {/* Suggested action chips */}
        {suggestions.length > 0 && (
          <SuggestedActionChips
            suggestions={suggestions}
            onSelect={handleSelectSuggestion}
            disabled={isRequesting}
          />
        )}

        {/* Move mapping preview */}
        {movePreview && (
          <MoveMappingPreview
            fromSuggestion={movePreview.fromSuggestion}
            fromIntent={movePreview.fromIntent}
          />
        )}

        {/* Freeform input row */}
        <Stack direction="row" gap={1} alignItems="flex-start">
          <TextField
            size="small"
            fullWidth
            multiline
            maxRows={3}
            placeholder="What do you do?"
            value={freeform}
            onChange={(e) => {
              setFreeform(e.target.value);
              if (resolvedMove) setResolvedMove(null);
              if (selectedAction) setSelectedAction(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (freeform.trim()) handleResolveIntent();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {resolving ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Tooltip title="Identify move">
                      <span>
                        <IconButton
                          size="small"
                          disabled={!freeform.trim() || isRequesting}
                          onClick={handleResolveIntent}
                        >
                          <AutoFixHighIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            size="small"
            disabled={!freeform.trim() || isRequesting}
            endIcon={<SendIcon sx={{ fontSize: 14 }} />}
            onClick={handleSubmit}
            sx={{ whiteSpace: "nowrap", alignSelf: "flex-end" }}
          >
            Play
          </Button>
        </Stack>

        {/* Suggestion controls */}
        <Stack direction="row" gap={1} alignItems="center">
          <Button
            size="small"
            color="inherit"
            startIcon={
              loadingSuggestions ? (
                <CircularProgress size={12} />
              ) : (
                <RefreshIcon sx={{ fontSize: 14 }} />
              )
            }
            disabled={loadingSuggestions || isRequesting}
            onClick={handleGetSuggestions}
            sx={{ opacity: 0.7, fontSize: 11 }}
          >
            {suggestions.length > 0 ? "Refresh suggestions" : "Get suggestions"}
          </Button>
        </Stack>
      </Box>
      <GuidedMoveModal
        open={modalOpen}
        onClose={handleModalClose}
        intent={modalIntent}
        moveName={modalMoveName}
      />
    </Box>
  );
}
