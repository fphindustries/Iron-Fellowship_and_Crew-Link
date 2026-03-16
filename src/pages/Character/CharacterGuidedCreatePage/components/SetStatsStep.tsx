import { Box, Button, Typography } from "@mui/material";

export interface SetStatsStepProps {
  onComplete: () => void;
}

export function SetStatsStep({ onComplete }: SetStatsStepProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Set Your Stats
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        This step is coming soon. You will assign values to your five stats:
        Edge, Heart, Iron, Shadow, and Wits.
      </Typography>
      <Button variant="contained" onClick={onComplete}>
        Continue
      </Button>
    </Box>
  );
}
