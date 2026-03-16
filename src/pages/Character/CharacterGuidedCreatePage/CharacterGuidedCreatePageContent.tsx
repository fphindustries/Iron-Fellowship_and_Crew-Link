import {
  Box,
  Step,
  StepLabel,
  Stepper,
  Paper,
} from "@mui/material";
import { PageContent, PageHeader } from "components/shared/Layout";
import { useAppName } from "hooks/useAppName";
import { Head } from "providers/HeadProvider/Head";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useStore } from "stores/store";
import { AssetDocument } from "api-calls/assets/_asset.type";
import { addCharacterToCampaign } from "api-calls/campaign/addCharacterToCampaign";
import {
  CAMPAIGN_ROUTES,
  constructCampaignSheetPath,
} from "pages/Campaign/routes";
import { constructCharacterSheetPath } from "pages/Character/routes";
import { ignoreApiError } from "api-calls/createApiFunction";
import { ChoosePathsStep } from "pages/Character/CharacterCreatePage/components/guided/ChoosePathsStep";
import { CreateBackstoryStep } from "pages/Character/CharacterCreatePage/components/guided/CreateBackstoryStep";
import { CreateBackgroundVowStep } from "pages/Character/CharacterCreatePage/components/guided/CreateBackgroundVowStep";
import { ChooseFinalAssetStep } from "./components/ChooseFinalAssetStep";
import { SetStatsStep } from "./components/SetStatsStep";
import { EnvisionCharacterStep } from "./components/EnvisionCharacterStep";
import { NameCharacterStep } from "./components/NameCharacterStep";

interface GuidedForm {
  enabledExpansionMap: Record<string, boolean>;
  stats: Record<string, number>;
  assets: AssetDocument[];
  backstory?: string;
  backgroundVow?: string;
}

const STEPS = [
  "Choose Your Paths",
  "Create Your Backstory",
  "Write Your Background Vow",
  "Choose Your Final Asset",
  "Set Your Stats",
  "Envision Your Character",
  "Name Your Character",
];

export function CharacterGuidedCreatePageContent() {
  const uid = useStore((store) => store.auth.uid);
  const campaignId = useSearchParams()[0].get("campaignId");
  const navigate = useNavigate();
  const appName = useAppName();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Context captured from earlier steps to pass forward
  const [completedPathNames, setCompletedPathNames] = useState<string[]>([]);
  const [completedBackstory, setCompletedBackstory] = useState("");

  const assetMap = useStore((s) => s.rules.assetMaps.assetMap);
  const createCharacter = useStore((store) => store.characters.createCharacter);

  const { control } = useForm<GuidedForm>();
  const { append } = useFieldArray({
    control,
    name: "assets",
    keyName: "hook-form-id",
  });

  // Accumulated form data built up across steps
  const [formData, setFormData] = useState<{
    assets: AssetDocument[];
    backstory: string;
    backgroundVow: string;
    stats: Record<string, number>;
  }>({
    assets: [],
    backstory: "",
    backgroundVow: "",
    stats: {},
  });

  const advance = () => setActiveStep((s) => s + 1);

  const handlePathsComplete = (assets: AssetDocument[]) => {
    assets.forEach((a) => append(a));
    setCompletedPathNames(
      assets.map((a) => assetMap[a.id]?.name ?? "").filter(Boolean)
    );
    setFormData((prev) => ({ ...prev, assets: [...prev.assets, ...assets] }));
    advance();
  };

  const handleBackstoryComplete = (backstory: string) => {
    setCompletedBackstory(backstory);
    setFormData((prev) => ({ ...prev, backstory }));
    advance();
  };

  const handleVowComplete = (backgroundVow: string) => {
    setFormData((prev) => ({ ...prev, backgroundVow }));
    advance();
  };

  const handleNameComplete = (name: string) => {
    setLoading(true);
    createCharacter(
      name,
      formData.stats,
      formData.assets,
      undefined,
      undefined,
      formData.backstory || undefined,
      formData.backgroundVow || undefined
    )
      .then((characterId) => {
        if (campaignId) {
          addCharacterToCampaign({ uid, campaignId, characterId }).finally(
            () => {
              navigate(
                constructCampaignSheetPath(campaignId, CAMPAIGN_ROUTES.SHEET)
              );
            }
          );
        } else {
          navigate(constructCharacterSheetPath(characterId));
        }
      })
      .catch(ignoreApiError)
      .finally(() => setLoading(false));
  };

  return (
    <>
      <Head
        title={"Guided Character Creation"}
        description={`Create a character on ${appName}`}
      />
      <PageHeader label={"Guided Character Creation"} />
      <PageContent isPaper>
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{ mb: 4, overflowX: "auto", pb: 1 }}
        >
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box>
            {activeStep === 0 && (
              <ChoosePathsStep onComplete={handlePathsComplete} />
            )}
            {activeStep === 1 && (
              <CreateBackstoryStep onComplete={handleBackstoryComplete} />
            )}
            {activeStep === 2 && (
              <CreateBackgroundVowStep
                onComplete={handleVowComplete}
                pathNames={completedPathNames}
                backstory={completedBackstory}
              />
            )}
            {activeStep === 3 && (
              <ChooseFinalAssetStep onComplete={advance} />
            )}
            {activeStep === 4 && (
              <SetStatsStep onComplete={advance} />
            )}
            {activeStep === 5 && (
              <EnvisionCharacterStep onComplete={advance} />
            )}
            {activeStep === 6 && (
              <NameCharacterStep
                onComplete={handleNameComplete}
                loading={loading}
              />
            )}
          </Box>
        </Paper>
      </PageContent>
    </>
  );
}
