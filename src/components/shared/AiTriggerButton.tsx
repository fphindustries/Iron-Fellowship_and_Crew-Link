import { IconButton, Tooltip } from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { AiMode } from "api-calls/ai/_ai.type";
import { useStore } from "stores/store";
import { useAiCopilot } from "hooks/featureFlags/useAiCopilot";

interface AiTriggerButtonProps {
  mode: AiMode;
  prefill?: string;
  tooltip?: string;
  size?: "small" | "medium" | "large";
}

export function AiTriggerButton({
  mode,
  prefill,
  tooltip = "Open AI Copilot",
  size = "small",
}: AiTriggerButtonProps) {
  const showAiCopilot = useAiCopilot();
  const openWithMode = useStore((store) => store.ai.openWithMode);

  if (!showAiCopilot) return null;

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
