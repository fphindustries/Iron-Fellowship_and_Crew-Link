import { Box, Chip, Typography } from "@mui/material";
import { IntentToMoveOutput, SuggestedAction } from "types/AI.type";

const CONFIDENCE_COLOR: Record<
  "high" | "medium" | "low",
  "success" | "warning" | "default"
> = {
  high: "success",
  medium: "warning",
  low: "default",
};

interface MoveMappingPreviewProps {
  /** Populated when a suggested action chip has been selected */
  fromSuggestion?: SuggestedAction;
  /** Populated when the AI resolved freeform text to a move */
  fromIntent?: IntentToMoveOutput;
}

export function MoveMappingPreview(props: MoveMappingPreviewProps) {
  const { fromSuggestion, fromIntent } = props;

  const moveName = fromSuggestion?.moveName ?? fromIntent?.moveName;
  const stat = fromSuggestion?.stat ?? fromIntent?.stat;
  const confidence = fromSuggestion?.confidence ?? fromIntent?.confidence ?? "medium";
  const reason = fromSuggestion?.reason ?? fromIntent?.reason;
  const assetSuggestions = fromIntent?.assetSuggestions;

  if (!moveName) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 0.75,
        px: 0.5,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Likely move:
      </Typography>
      <Chip
        label={`${moveName}${stat ? ` +${stat}` : ""}`}
        size="small"
        variant="filled"
        color={CONFIDENCE_COLOR[confidence]}
      />
      {reason && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
          {reason}
        </Typography>
      )}
      {assetSuggestions && assetSuggestions.length > 0 && (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {assetSuggestions.map((a) => (
            <Chip
              key={a}
              label={a}
              size="small"
              variant="outlined"
              color="default"
              sx={{ fontSize: 10 }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
