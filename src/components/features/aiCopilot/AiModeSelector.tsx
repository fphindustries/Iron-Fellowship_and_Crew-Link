import { Stack, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SummarizeIcon from "@mui/icons-material/Summarize";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { AiMode } from "api-calls/ai/_ai.type";

interface AiModeSelectorProps {
  value: AiMode;
  onChange: (mode: AiMode) => void;
}

interface ModeConfig {
  mode: AiMode;
  label: string;
  tooltip: string;
  icon: React.ReactNode;
}

const MODES: ModeConfig[] = [
  {
    mode: "storyGenerator",
    label: "Story",
    tooltip: "Generate scene possibilities, complications, and twists",
    icon: <AutoFixHighIcon fontSize="small" />,
  },
  {
    mode: "stuckPlayer",
    label: "Unstuck",
    tooltip: "Get next actions and escalation options when you're not sure what to do",
    icon: <HelpOutlineIcon fontSize="small" />,
  },
  {
    mode: "actionElaborator",
    label: "Action",
    tooltip: "Elaborate on a character action with vivid narrative and move suggestions",
    icon: <EditNoteIcon fontSize="small" />,
  },
  {
    mode: "sessionRecap",
    label: "Recap",
    tooltip: "Summarize the session and extract canon facts",
    icon: <SummarizeIcon fontSize="small" />,
  },
  {
    mode: "bookkeeper",
    label: "Log",
    tooltip: "Convert freeform session notes into structured campaign updates",
    icon: <ListAltIcon fontSize="small" />,
  },
];

export function AiModeSelector({ value, onChange }: AiModeSelectorProps) {
  return (
    <Stack direction="row" justifyContent="center">
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, newMode) => {
          if (newMode !== null) onChange(newMode as AiMode);
        }}
        size="small"
        sx={{ flexWrap: "wrap" }}
      >
        {MODES.map(({ mode, label, tooltip, icon }) => (
          <Tooltip key={mode} title={tooltip} placement="top">
            <ToggleButton value={mode} sx={{ gap: 0.5, px: 1 }}>
              {icon}
              {label}
            </ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
