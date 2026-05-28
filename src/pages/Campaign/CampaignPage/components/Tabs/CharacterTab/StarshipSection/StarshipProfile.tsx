import {
  Box,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import AddIcon from "@mui/icons-material/Add";
import { useRoller } from "stores/appState/useRoller";

const ORACLE_NAME = "starforged/oracles/starships/starship_name";
const ORACLE_HISTORY = "starforged/oracles/campaign_launch/starship_history";
const ORACLE_QUIRK = "starforged/oracles/campaign_launch/starship_quirks";

export interface StarshipProfileProps {
  name: string;
  history: string;
  quirks: string[];
  onNameChange: (v: string) => void;
  onHistoryChange: (v: string) => void;
  onQuirksChange: (v: string[]) => void;
}

export function StarshipProfile({
  name,
  history,
  quirks,
  onNameChange,
  onHistoryChange,
  onQuirksChange,
}: StarshipProfileProps) {
  const { rollOracleTable } = useRoller();

  const rollName = () => {
    const result = rollOracleTable(ORACLE_NAME, false)?.result;
    if (result) onNameChange(result);
  };

  const rollHistory = () => {
    const result = rollOracleTable(ORACLE_HISTORY, false)?.result;
    if (result) onHistoryChange(result);
  };

  const addQuirk = () => {
    const result = rollOracleTable(ORACLE_QUIRK, false)?.result;
    if (result) onQuirksChange([...quirks, result]);
  };

  const removeQuirk = (index: number) => {
    onQuirksChange(quirks.filter((_, i) => i !== index));
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Ship Name
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Name your ship..."
            size="small"
            fullWidth
          />
          <Tooltip title="Roll oracle for name">
            <IconButton onClick={rollName} size="small">
              <CasinoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          History
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            value={history}
            onChange={(e) => onHistoryChange(e.target.value)}
            placeholder="What's the story of your ship?"
            multiline
            minRows={3}
            fullWidth
          />
          <Tooltip title="Roll oracle for history">
            <IconButton onClick={rollHistory} size="small" sx={{ mt: 0.5 }}>
              <CasinoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Quirks</Typography>
          <Tooltip title="Roll oracle for a quirk">
            <IconButton onClick={addQuirk} size="small">
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        {quirks.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {quirks.map((quirk, i) => (
              <Chip
                key={i}
                label={quirk}
                onDelete={() => removeQuirk(i)}
                size="small"
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No quirks yet — click + to roll one
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
