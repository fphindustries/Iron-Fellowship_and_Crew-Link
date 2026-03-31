import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { useStore } from "stores/store";

const CONFRONT_CHAOS_MOVE_ID = "starforged/moves/exploration/confront_chaos";
const CONFRONT_CHAOS_MOVE_NAME = "Confront Chaos";

export interface ConfrontChaosDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ConfrontChaosDialog({
  open,
  onClose,
}: ConfrontChaosDialogProps) {
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const logMoveEvent = useStore((s) => s.sessionLog.logMoveEvent);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await logMoveEvent({
        moveName: CONFRONT_CHAOS_MOVE_NAME,
        moveId: CONFRONT_CHAOS_MOVE_ID,
        playerContext: description.trim() || undefined,
      });
      handleClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setDescription("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={saving}
    >
      <DialogTitle>Confront Chaos</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          When your exploration of a waypoint reveals a dreadful truth, roll on
          the oracle tables to envision what horror or threat you face.
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          mb={0.5}
        >
          What do you encounter? (optional)
        </Typography>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={3}
          placeholder="Describe the horror, threat, or dark revelation you uncover..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />

        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            This is a special move — no roll required. Envision the chaos you
            confront and record it as part of your expedition log.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={saving}
          startIcon={
            saving ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          {saving ? "Saving…" : "Log Event"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
