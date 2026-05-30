import { Chip } from "@mui/material";

type Knowledge = "known" | "suspected" | "hidden";

interface KnowledgeBadgeProps {
  knowledge: Knowledge;
}

const colors: Record<Knowledge, "success" | "warning" | "default"> = {
  known: "success",
  suspected: "warning",
  hidden: "default",
};

export function KnowledgeBadge({ knowledge }: KnowledgeBadgeProps) {
  return (
    <Chip
      label={knowledge.charAt(0).toUpperCase() + knowledge.slice(1)}
      size="small"
      color={colors[knowledge]}
      variant="outlined"
      sx={{ fontSize: 10, height: 18, px: 0.25 }}
    />
  );
}
