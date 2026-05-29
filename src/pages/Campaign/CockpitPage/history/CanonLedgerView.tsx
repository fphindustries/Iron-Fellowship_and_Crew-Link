import { useState, useCallback } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useStore } from "stores/store";
import { CanonFact } from "types/AIGuideState.type";

export function CanonLedgerView() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const canonLedger = useStore(
    (store) => store.aiGuide.state?.canonLedger ?? []
  );
  const addCanonToLedger = useStore((store) => store.aiGuide.addCanonToLedger);
  const updateCanonFact = useStore((store) => store.aiGuide.updateCanonFact);
  const removeCanonFact = useStore((store) => store.aiGuide.removeCanonFact);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editFact, setEditFact] = useState<CanonFact | null>(null);
  const [inputText, setInputText] = useState("");

  const confirmed = canonLedger.filter((f) => f.status === "confirmed");
  const proposed = canonLedger.filter((f) => f.status === "proposed");

  const handleAdd = useCallback(async () => {
    if (!campaignId || !inputText.trim()) return;
    await addCanonToLedger(campaignId, {
      text: inputText.trim(),
      source: "player",
      status: "confirmed",
    });
    setInputText("");
    setAddDialogOpen(false);
  }, [campaignId, inputText, addCanonToLedger]);

  const handleEditSave = useCallback(async () => {
    if (!campaignId || !editFact || !inputText.trim()) return;
    await updateCanonFact(campaignId, editFact.id, { text: inputText.trim() });
    setEditFact(null);
    setInputText("");
  }, [campaignId, editFact, inputText, updateCanonFact]);

  const handleAccept = useCallback(
    async (fact: CanonFact) => {
      if (!campaignId) return;
      await updateCanonFact(campaignId, fact.id, { status: "confirmed" });
    },
    [campaignId, updateCanonFact]
  );

  const handleDelete = useCallback(
    async (factId: string) => {
      if (!campaignId) return;
      await removeCanonFact(campaignId, factId);
    },
    [campaignId, removeCanonFact]
  );

  const openEdit = (fact: CanonFact) => {
    setEditFact(fact);
    setInputText(fact.text);
  };

  return (
    <Box>
      {proposed.length > 0 && (
        <Box mb={2}>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mb={0.75}
            sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            Proposed Canon
          </Typography>
          <Stack spacing={0.75}>
            {proposed.map((fact) => (
              <FactRow
                key={fact.id}
                fact={fact}
                onAccept={() => handleAccept(fact)}
                onEdit={() => openEdit(fact)}
                onDelete={() => handleDelete(fact.id)}
              />
            ))}
          </Stack>
          <Divider sx={{ mt: 2, mb: 2 }} />
        </Box>
      )}

      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={0.75}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          Confirmed Canon
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            setInputText("");
            setAddDialogOpen(true);
          }}
          sx={{ fontSize: 11 }}
        >
          Add
        </Button>
      </Box>

      {confirmed.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
          No confirmed canon yet. Accept AI proposals or add facts manually.
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {confirmed.map((fact) => (
            <FactRow
              key={fact.id}
              fact={fact}
              onEdit={() => openEdit(fact)}
              onDelete={() => handleDelete(fact.id)}
            />
          ))}
        </Stack>
      )}

      {/* Add dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Canon Fact</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            placeholder="Describe a confirmed fact about the story…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            variant="contained"
            disabled={!inputText.trim()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={Boolean(editFact)}
        onClose={() => setEditFact(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Canon Fact</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditFact(null)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={!inputText.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

interface FactRowProps {
  fact: CanonFact;
  onAccept?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function FactRow({ fact, onAccept, onEdit, onDelete }: FactRowProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0.5,
        p: 1,
        borderRadius: 1,
        border: 1,
        borderColor: fact.status === "proposed" ? "primary.light" : "divider",
        bgcolor: fact.status === "proposed" ? "action.hover" : undefined,
      }}
    >
      <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.4 }}>
        {fact.text}
      </Typography>
      <Box display="flex" gap={0.25} flexShrink={0}>
        {onAccept && (
          <Tooltip title="Accept as canon">
            <IconButton size="small" onClick={onAccept}>
              <CheckIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Edit">
          <IconButton size="small" onClick={onEdit}>
            <EditIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={onDelete} color="error">
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
