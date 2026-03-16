import { Box, Button, Typography } from "@mui/material";

export interface ChooseFinalAssetStepProps {
  onComplete: () => void;
}

export function ChooseFinalAssetStep({ onComplete }: ChooseFinalAssetStepProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Choose Your Final Asset
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        This step is coming soon. You will choose one additional asset to round
        out your character.
      </Typography>
      <Button variant="contained" onClick={onComplete}>
        Continue
      </Button>
    </Box>
  );
}
