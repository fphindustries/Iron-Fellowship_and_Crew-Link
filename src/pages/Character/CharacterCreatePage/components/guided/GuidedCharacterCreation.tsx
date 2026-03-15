import {
  Box,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import { Control, useFieldArray } from "react-hook-form";
import { Form } from "../../CharacterCreatePageContent";
import { AssetDocument } from "api-calls/assets/_asset.type";
import { ChoosePathsStep } from "./ChoosePathsStep";

const STEPS = [
  "Choose Your Paths",
  // Future steps will be added here
];

interface GuidedCharacterCreationProps {
  control: Control<Form>;
}

export function GuidedCharacterCreation({
  control,
}: GuidedCharacterCreationProps) {
  const { append } = useFieldArray({
    control,
    name: "assets",
    keyName: "hook-form-id",
  });

  const handlePathsComplete = (assets: AssetDocument[]) => {
    assets.forEach((asset) => append(asset));
  };

  return (
    <Box>
      <Stepper activeStep={0} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Typography variant="body2" color="text.secondary" mb={2}>
        Step 1 of {STEPS.length}: Choose 2 Path assets that define your
        character&apos;s background. You can add more assets after creating your
        character.
      </Typography>

      <ChoosePathsStep onComplete={handlePathsComplete} />
    </Box>
  );
}
