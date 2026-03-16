import { Box, Button, Typography } from "@mui/material";

export interface EnvisionCharacterStepProps {
  onComplete: () => void;
}

export function EnvisionCharacterStep({ onComplete }: EnvisionCharacterStepProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Envision Your Character
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        This step is coming soon. You will envision your character&apos;s
        appearance and identity — their look, personality, and how others
        perceive them.
      </Typography>
      <Button variant="contained" onClick={onComplete}>
        Continue
      </Button>
    </Box>
  );
}
