import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SwordsIcon from "@mui/icons-material/SportsMartialArts";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { CombatPosition } from "types/combat.types";
import { ROLL_RESULT } from "types/DieRolls.type";
import { useCombatTracker } from "hooks/useCombatTracker";

export function CombatTracker() {
  const { activeCombat, frayTrack, setPosition, addEnemy, removeEnemy, endCombat } =
    useCombatTracker();
  const [collapsed, setCollapsed] = useState(false);
  const [newEnemyName, setNewEnemyName] = useState("");
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [endDescription, setEndDescription] = useState("");
  const [ending, setEnding] = useState(false);

  if (!activeCombat) return null;

  const handlePositionToggle = (pos: CombatPosition) => {
    if (pos !== activeCombat.position) {
      setPosition(pos).catch(console.error);
    }
  };

  const handleAddEnemy = () => {
    const name = newEnemyName.trim();
    if (!name) return;
    addEnemy({ name }).catch(console.error);
    setNewEnemyName("");
  };

  const handleEndCombat = async () => {
    setEnding(true);
    try {
      await endCombat(ROLL_RESULT.WEAK_HIT, endDescription.trim() || undefined);
      setEndDialogOpen(false);
      setEndDescription("");
    } catch (e) {
      console.error(e);
    } finally {
      setEnding(false);
    }
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{ mx: 2, mb: 1, p: 1.5, borderColor: "warning.main" }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={collapsed ? 0 : 1}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <SwordsIcon fontSize="small" color="warning" />
            <Typography variant="subtitle2" color="warning.main">
              Active Combat
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: "italic" }}
            >
              — {activeCombat.objective}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? (
              <ExpandMoreIcon fontSize="small" />
            ) : (
              <ExpandLessIcon fontSize="small" />
            )}
          </IconButton>
        </Box>

        <Collapse in={!collapsed}>
          <Box mb={1}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Position:
            </Typography>
            <Box display="flex" gap={1}>
              <Chip
                label="In Control"
                size="small"
                color={
                  activeCombat.position === "in_control" ? "success" : "default"
                }
                variant={
                  activeCombat.position === "in_control" ? "filled" : "outlined"
                }
                onClick={() => handlePositionToggle("in_control")}
                clickable
              />
              <Chip
                label="In a Bad Spot"
                size="small"
                color={
                  activeCombat.position === "in_a_bad_spot" ? "error" : "default"
                }
                variant={
                  activeCombat.position === "in_a_bad_spot"
                    ? "filled"
                    : "outlined"
                }
                onClick={() => handlePositionToggle("in_a_bad_spot")}
                clickable
              />
            </Box>
          </Box>

          {frayTrack && (
            <Box mb={1}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Progress ({frayTrack.difficulty}): {Math.floor(frayTrack.value / 4)} / 10 boxes
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.floor(frayTrack.value / 4) * 10}
                sx={{ height: 6, borderRadius: 1 }}
                color="warning"
              />
            </Box>
          )}

          {activeCombat.enemies.length > 0 && (
            <Box mb={1}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Enemies:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {activeCombat.enemies.map((enemy, i) => (
                  <Chip
                    key={i}
                    label={enemy.name}
                    size="small"
                    variant="outlined"
                    onDelete={() => removeEnemy(i).catch(console.error)}
                    deleteIcon={<CloseIcon />}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Box display="flex" gap={1} alignItems="center" mb={1}>
            <TextField
              size="small"
              placeholder="Add enemy…"
              value={newEnemyName}
              onChange={(e) => setNewEnemyName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleAddEnemy();
              }}
              sx={{ flexGrow: 1 }}
            />
            <Tooltip title="Add enemy">
              <span>
                <IconButton
                  size="small"
                  onClick={handleAddEnemy}
                  disabled={!newEnemyName.trim()}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => setEndDialogOpen(true)}
          >
            End Combat
          </Button>
        </Collapse>
      </Paper>

      <Dialog
        open={endDialogOpen}
        onClose={() => !ending && setEndDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>End Combat</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Use this to close the tracker without a formal progress roll. To end
            combat through a move, use &ldquo;Take Decisive Action&rdquo; or
            &ldquo;Battle&rdquo; instead.
          </Alert>
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            placeholder="How does the combat resolve? (optional)"
            value={endDescription}
            onChange={(e) => setEndDescription(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndDialogOpen(false)} disabled={ending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEndCombat}
            disabled={ending}
          >
            End Combat
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
