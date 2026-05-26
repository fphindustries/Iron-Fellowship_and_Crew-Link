import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import { useStore } from "stores/store";
import { rollOracle } from "stores/appState/rollers/rollOracle";

const BEGIN_SESSION_ORACLE_ID = "starforged/oracles/moves/begin_a_session";
const BEGIN_SESSION_MOVE_ID = "starforged/moves/session/begin_a_session";

export interface BeginSessionParams {
  moveId: string;
  moveName: string;
  playerContext: string;
  useAiGuide: boolean;
}

export interface BeginSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onBegin: (params: BeginSessionParams) => void;
  previousSessionSummary?: string;
}

export function BeginSessionDialog(props: BeginSessionDialogProps) {
  const { open, onClose, onBegin, previousSessionSummary } = props;

  const [scene, setScene] = useState("");
  const [spotlightEnabled, setSpotlightEnabled] = useState(false);
  const [spotlightText, setSpotlightText] = useState("");
  const [oracleRoll, setOracleRoll] = useState<
    | { oracleName: string; oracleId: string; roll: number | number[]; result: string }
    | undefined
  >(undefined);
  const [useAiGuide, setUseAiGuide] = useState(false);

  const beginSessionOracle = useStore(
    (s) => s.rules.oracleMaps.oracleTableRollableMap[BEGIN_SESSION_ORACLE_ID]
  );
  const beginSessionMove = useStore(
    (s) => s.rules.moveMaps.moveMap[BEGIN_SESSION_MOVE_ID]
  );
  const characterId = useStore(
    (s) => s.characters.currentCharacter.currentCharacterId ?? null
  );
  const uid = useStore((s) => s.auth.uid);

  const moveId = beginSessionMove?._id ?? BEGIN_SESSION_MOVE_ID;
  const moveName = beginSessionMove?.name ?? "Begin a Session";

  const handleRollOracle = () => {
    if (!beginSessionOracle) return;
    const result = rollOracle(beginSessionOracle, characterId, uid, false);
    if (result) {
      setOracleRoll({
        oracleName: result.rollLabel,
        oracleId: result.oracleId ?? BEGIN_SESSION_ORACLE_ID,
        roll: result.roll,
        result: result.result,
      });
    }
  };

  const handleBegin = () => {
    const parts: string[] = [];
    if (scene.trim()) parts.push(`Scene: ${scene.trim()}`);
    if (spotlightEnabled) {
      if (oracleRoll) parts.push(`Oracle inspiration: ${oracleRoll.result}`);
      if (spotlightText.trim()) parts.push(`Spotlight: ${spotlightText.trim()}`);
    }

    onBegin({
      moveId,
      moveName,
      playerContext: parts.join("\n"),
      useAiGuide,
    });
    // Reset form
    setScene("");
    setSpotlightEnabled(false);
    setSpotlightText("");
    setOracleRoll(undefined);
    setUseAiGuide(false);
  };

  const handleClose = () => {
    onClose();
    setScene("");
    setSpotlightEnabled(false);
    setSpotlightText("");
    setOracleRoll(undefined);
    setUseAiGuide(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Begin a Session</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          When you begin a significant session or chapter of play, set the scene
          by envisioning your character&apos;s current situation and intent.
        </Typography>

        {/* Previous session summary (read-only) */}
        {previousSessionSummary && (
          <Box mb={2.5}>
            <Typography variant="subtitle2" gutterBottom>
              Previously&hellip;
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              fontStyle="italic"
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: "action.hover",
              }}
            >
              {previousSessionSummary}
            </Typography>
          </Box>
        )}

        {/* Scene */}
        <Typography variant="subtitle2" gutterBottom>
          Set the Scene
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder="Describe your character's current situation and intent."
          value={scene}
          onChange={(e) => setScene(e.target.value)}
          sx={{ mb: 2.5 }}
        />

        {/* Spotlight — optional */}
        <FormControlLabel
          control={
            <Checkbox
              checked={spotlightEnabled}
              onChange={(e) => setSpotlightEnabled(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="subtitle2">
              Spotlight a new danger, opportunity, or insight (optional)
            </Typography>
          }
          sx={{ mb: 0.5 }}
        />

        <Collapse in={spotlightEnabled}>
          <Box pl={1} pt={1} pb={1}>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Envision a brief vignette — this can include a scene hidden from
              your character&apos;s perspective. All players take{" "}
              <strong>+1 momentum</strong> as you return to play from the
              viewpoint of your characters.
            </Typography>

            {/* Oracle roll */}
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              {beginSessionOracle && (
                <Tooltip title="Roll for vignette inspiration">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CasinoIcon />}
                    onClick={handleRollOracle}
                  >
                    Roll for Inspiration
                  </Button>
                </Tooltip>
              )}
              {oracleRoll && (
                <Typography variant="body2" color="text.secondary">
                  ({oracleRoll.roll}):{" "}
                  <em>{oracleRoll.result}</em>
                </Typography>
              )}
            </Box>

            <TextField
              fullWidth
              multiline
              minRows={2}
              placeholder="Describe the vignette or spotlight moment."
              value={spotlightText}
              onChange={(e) => setSpotlightText(e.target.value)}
            />
          </Box>
        </Collapse>

        {/* AI Guide option */}
        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <FormControlLabel
            control={
              <Checkbox
                checked={useAiGuide}
                onChange={(e) => setUseAiGuide(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Ask the Guide to narrate this session opening
              </Typography>
            }
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleBegin}>
          Begin Session
        </Button>
      </DialogActions>
    </Dialog>
  );
}
