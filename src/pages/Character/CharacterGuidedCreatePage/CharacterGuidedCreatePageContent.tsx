import {
  Box,
  Button,
  Step,
  StepLabel,
  Stepper,
  Paper,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
import { addNote } from "api-calls/notes/addNote";
import { updateNote } from "api-calls/notes/updateNote";
import * as Y from "yjs";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { ChoosePathsStep } from "pages/Character/CharacterCreatePage/components/guided/ChoosePathsStep";
import { CreateBackstoryStep } from "pages/Character/CharacterCreatePage/components/guided/CreateBackstoryStep";
import { CreateBackgroundVowStep } from "pages/Character/CharacterCreatePage/components/guided/CreateBackgroundVowStep";
import { ChooseFinalAssetStep } from "./components/ChooseFinalAssetStep";
import { SetStatsStep } from "./components/SetStatsStep";
import { EnvisionCharacterStep } from "./components/EnvisionCharacterStep";
import { NameCharacterStep } from "./components/NameCharacterStep";
import { ReviewStep } from "./components/ReviewStep";

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
  "Review",
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
  const [completedBackgroundVow, setCompletedBackgroundVow] = useState("");

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
    portrait?: { image: File; scale: number; position: { x: number; y: number } };
    look: string;
    act: string;
    wear: string;
    pronouns: string;
    name: string;
    aiSummary: string;
  }>({
    assets: [],
    backstory: "",
    backgroundVow: "",
    stats: {},
    look: "",
    act: "",
    wear: "",
    pronouns: "they/them",
    name: "",
    aiSummary: "",
  });

  const advance = () => setActiveStep((s) => s + 1);
  const goBack = () => setActiveStep((s) => s - 1);

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
    setCompletedBackgroundVow(backgroundVow);
    setFormData((prev) => ({ ...prev, backgroundVow }));
    advance();
  };

  const handleFinalAssetComplete = (asset: AssetDocument) => {
    setFormData((prev) => ({ ...prev, assets: [...prev.assets, asset] }));
    advance();
  };

  const handleStatsComplete = (stats: Record<string, number>) => {
    setFormData((prev) => ({ ...prev, stats }));
    advance();
  };

  const handleEnvisionComplete = (data: {
    portrait?: { image: File; scale: number; position: { x: number; y: number } };
    look: string;
    act: string;
    wear: string;
    pronouns: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      portrait: data.portrait,
      look: data.look,
      act: data.act,
      wear: data.wear,
      pronouns: data.pronouns,
    }));
    advance();
  };

  const handleNameComplete = (name: string, aiSummary: string) => {
    setFormData((prev) => ({ ...prev, name, aiSummary }));
    advance();
  };

  const saveSummaryNote = (characterId: string, summary: string) => {
    const paragraphs = summary
      .split(/\n\n+/)
      .filter(Boolean)
      .map((text) => ({
        type: "paragraph",
        content: [{ type: "text", text }],
      }));
    const tiptapJson = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Character Summary" }],
        },
        ...paragraphs,
      ],
    };
    const ydoc = TiptapTransformer.toYdoc(tiptapJson, "default");
    const content = Y.encodeStateAsUpdate(ydoc);
    return addNote({ characterId, order: 0 }).then((noteId) =>
      updateNote({
        characterId,
        campaignId: undefined,
        noteId,
        title: "Character Summary",
        content,
      })
    );
  };

  const handleAccept = () => {
    setLoading(true);
    createCharacter(
      formData.name,
      formData.stats,
      formData.assets,
      formData.portrait,
      undefined,
      formData.backstory || undefined,
      formData.backgroundVow || undefined
    )
      .then((characterId) => {
        const afterSummary = () => {
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
        };

        if (formData.aiSummary) {
          saveSummaryNote(characterId, formData.aiSummary)
            .catch(ignoreApiError)
            .finally(afterSummary);
        } else {
          afterSummary();
        }
      })
      .catch(ignoreApiError)
      .finally(() => setLoading(false));
  };

  // The review step (last) has its own Back button
  const showBackButton = activeStep > 0 && activeStep < STEPS.length - 1;

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
              <ChooseFinalAssetStep
                onComplete={handleFinalAssetComplete}
                pathNames={completedPathNames}
                backstory={completedBackstory}
                backgroundVow={completedBackgroundVow}
              />
            )}
            {activeStep === 4 && (
              <SetStatsStep
                onComplete={handleStatsComplete}
                pathNames={completedPathNames}
                backstory={completedBackstory}
                backgroundVow={completedBackgroundVow}
                initialStats={
                  Object.keys(formData.stats).length > 0
                    ? formData.stats
                    : undefined
                }
              />
            )}
            {activeStep === 5 && (
              <EnvisionCharacterStep
                onComplete={handleEnvisionComplete}
                pathNames={completedPathNames}
                backstory={completedBackstory}
                backgroundVow={completedBackgroundVow}
                initialLook={formData.look || undefined}
                initialAct={formData.act || undefined}
                initialWear={formData.wear || undefined}
                initialPronouns={formData.pronouns || undefined}
              />
            )}
            {activeStep === 6 && (
              <NameCharacterStep
                onComplete={handleNameComplete}
                initialName={formData.name || undefined}
                pathNames={completedPathNames}
                backstory={completedBackstory}
                backgroundVow={completedBackgroundVow}
                look={formData.look}
                act={formData.act}
                wear={formData.wear}
                pronouns={formData.pronouns}
              />
            )}
            {activeStep === 7 && (
              <ReviewStep
                formData={formData}
                onAccept={handleAccept}
                onBack={goBack}
                loading={loading}
              />
            )}
          </Box>
        </Paper>

        {showBackButton && (
          <Box mt={2}>
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={goBack}
            >
              Back
            </Button>
          </Box>
        )}
      </PageContent>
    </>
  );
}
