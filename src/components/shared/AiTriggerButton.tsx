import { IconButton, Tooltip } from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { AiMode } from "types/AI.type";
import { useStore } from "stores/store";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";

interface AiTriggerButtonProps {
  mode: AiMode;
  prefill?: string;
  tooltip?: string;
  size?: "small" | "medium" | "large";
}

export function AiTriggerButton({
  mode,
  prefill,
  tooltip = "Open AI Guide",
  size = "small",
}: AiTriggerButtonProps) {
  const showAiGuide = useAiGuide();
  const openWithMode = useStore((store) => store.ai.openWithMode);

  if (!showAiGuide) return null;

  return (
    <Tooltip title={tooltip}>
      <IconButton
        size={size}
        onClick={() => openWithMode(mode, prefill)}
        aria-label={tooltip}
      >
        <AutoFixHighIcon fontSize="inherit" />
      </IconButton>
    </Tooltip>
  );
}
