import { Chip } from "@mui/material";
import { AiEventStatus } from "api-calls/ai/_ai.type";

interface AiStatusBadgeProps {
  status: AiEventStatus;
}

const STATUS_LABELS: Record<AiEventStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  edited: "Edited",
};

const STATUS_COLORS: Record<
  AiEventStatus,
  "default" | "success" | "error" | "info"
> = {
  pending: "default",
  accepted: "success",
  rejected: "error",
  edited: "info",
};

export function AiStatusBadge({ status }: AiStatusBadgeProps) {
  return (
    <Chip
      label={STATUS_LABELS[status]}
      color={STATUS_COLORS[status]}
      size="small"
    />
  );
}
