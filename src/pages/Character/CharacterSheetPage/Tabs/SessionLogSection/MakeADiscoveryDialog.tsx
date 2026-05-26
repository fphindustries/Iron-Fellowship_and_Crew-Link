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

const MAKE_A_DISCOVERY_MOVE_ID = "starforged/moves/exploration/make_a_discovery";
const MAKE_A_DISCOVERY_MOVE_NAME = "Make a Discovery";

export interface MakeADiscoveryDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MakeADiscoveryDialog({
  open,
  onClose,
}: MakeADiscoveryDialogProps) {
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const logMoveEvent = useStore((s) => s.sessionLog.logMoveEvent);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await logMoveEvent({
        moveName: MAKE_A_DISCOVERY_MOVE_NAME,
        moveId: MAKE_A_DISCOVERY_MOVE_ID,
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
      <DialogTitle>Make a Discovery</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          When your exploration of a waypoint uncovers something wondrous, roll
          on the oracle tables to envision what you find.
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          mb={0.5}
        >
          What do you discover? (optional)
        </Typography>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={3}
          placeholder="Describe the wonder, relic, or revelation you encounter..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />

        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            This is a special move — no roll required. Envision your discovery
            and record it as part of your expedition log.
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
          {saving ? "Saving…" : "Log Discovery"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
