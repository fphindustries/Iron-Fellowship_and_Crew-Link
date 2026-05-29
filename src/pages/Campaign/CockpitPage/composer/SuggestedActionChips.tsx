import { Box, Chip, Tooltip, Typography } from "@mui/material";
import { SuggestedAction } from "types/AI.type";

const CATEGORY_COLOR: Record<
  SuggestedAction["intentCategory"],
  "default" | "primary" | "secondary" | "warning"
> = {
  investigative: "default",
  risky: "warning",
  social: "secondary",
  meta: "primary",
};

const CATEGORY_LABEL: Record<SuggestedAction["intentCategory"], string> = {
  investigative: "Safe / Investigative",
  risky: "Risky / Direct",
  social: "Social / Uncertain",
  meta: "Meta",
};

interface SuggestedActionChipsProps {
  suggestions: SuggestedAction[];
  onSelect: (action: SuggestedAction) => void;
  disabled?: boolean;
}

export function SuggestedActionChips(props: SuggestedActionChipsProps) {
  const { suggestions, onSelect, disabled } = props;

  // Group by category
  const groups = (
    ["investigative", "risky", "social", "meta"] as SuggestedAction["intentCategory"][]
  )
    .map((cat) => ({
      category: cat,
      items: suggestions.filter((s) => s.intentCategory === cat),
    }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {groups.map(({ category, items }) => (
        <Box key={category}>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ px: 0.5, display: "block", mb: 0.25 }}
          >
            {CATEGORY_LABEL[category]}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {items.map((action) => (
              <Tooltip
                key={action.label}
                title={
                  action.moveName
                    ? `${action.moveName}${action.stat ? ` +${action.stat}` : ""} · ${action.reason}`
                    : action.reason
                }
                placement="top"
              >
                <Chip
                  label={action.label}
                  size="small"
                  color={CATEGORY_COLOR[category]}
                  variant="outlined"
                  onClick={() => !disabled && onSelect(action)}
                  sx={{ cursor: disabled ? "default" : "pointer" }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
