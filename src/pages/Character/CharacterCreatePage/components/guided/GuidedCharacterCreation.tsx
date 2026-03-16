import {
  Box,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Control, useFieldArray, UseFormSetValue } from "react-hook-form";
import { Form } from "../../CharacterCreatePageContent";
import { AssetDocument } from "api-calls/assets/_asset.type";
import { ChoosePathsStep } from "./ChoosePathsStep";
import { CreateBackstoryStep } from "./CreateBackstoryStep";
import { useState } from "react";

const STEPS = ["Choose Your Paths", "Create Your Backstory"];

interface GuidedCharacterCreationProps {
  control: Control<Form>;
  setValue: UseFormSetValue<Form>;
}

export function GuidedCharacterCreation({
  control,
  setValue,
}: GuidedCharacterCreationProps) {
  const [activeStep, setActiveStep] = useState(0);

  const { append } = useFieldArray({
    control,
    name: "assets",
    keyName: "hook-form-id",
  });

  const handlePathsComplete = (assets: AssetDocument[]) => {
    assets.forEach((asset) => append(asset));
    setActiveStep(1);
  };

  const handleBackstoryComplete = (backstory: string) => {
    setValue("backstory", backstory);
    setActiveStep(2);
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Step 1 of {STEPS.length}: Choose 2 Path assets that define your
            character&apos;s background. You can add more assets after creating
            your character.
          </Typography>
          <ChoosePathsStep onComplete={handlePathsComplete} />
        </>
      )}

      {activeStep === 1 && (
        <>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Step 2 of {STEPS.length}: Write or generate a short backstory for
            your character.
          </Typography>
          <CreateBackstoryStep onComplete={handleBackstoryComplete} />
        </>
      )}

      {activeStep >= 2 && (
        <Stack direction="row" alignItems="center" spacing={1} color="success.main">
          <CheckCircleOutlineIcon />
          <Typography variant="body2" fontWeight={500}>
            Guided steps complete — fill in your stats below.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
