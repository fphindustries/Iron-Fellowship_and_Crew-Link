import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  Paper,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { PageContent, PageHeader } from "components/shared/Layout";
import { useAppName } from "hooks/useAppName";
import { Head } from "providers/HeadProvider/Head";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useStore } from "stores/store";
import { AssetDocument } from "types/Asset.type";
import {
  CAMPAIGN_ROUTES,
  constructCampaignSheetPath,
} from "pages/Campaign/routes";
import { constructCharacterSheetPath } from "pages/Character/routes";
import { api, ignoreApiError } from "config/api.config";
import * as Y from "yjs";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { ChoosePathsStep } from "./components/ChoosePathsStep";
import { CreateBackstoryStep } from "./components/CreateBackstoryStep";
import { CreateBackgroundVowStep } from "./components/CreateBackgroundVowStep";
import { ChooseFinalAssetStep } from "./components/ChooseFinalAssetStep";
import { SetStatsStep } from "./components/SetStatsStep";
import { EnvisionCharacterStep } from "./components/EnvisionCharacterStep";
import { NameCharacterStep } from "./components/NameCharacterStep";
import { ReviewStep } from "./components/ReviewStep";
import { WorldContext, WorldAiSettings } from "types/AI.type";
import { CUSTOM_TRUTH_INDEX } from "components/features/worlds/WorldTruths/customTruthIndex";
import { useAllWorldsQuery } from "hooks/queries/useWorldsQuery";
import {
  campaignKeys,
  useCampaignQuery,
  useUpdateCampaignCharacterMutation,
} from "hooks/queries/useCampaignsQuery";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateFullCharacterMutation } from "hooks/queries/useCharactersQuery";

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
  const campaignId = useSearchParams()[0].get("campaignId");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const appName = useAppName();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Context captured from earlier steps to pass forward
  const [completedPathNames, setCompletedPathNames] = useState<string[]>([]);
  const [completedBackstory, setCompletedBackstory] = useState("");
  const [completedBackgroundVow, setCompletedBackgroundVow] = useState("");
  const [completedFinalAssetName, setCompletedFinalAssetName] = useState<string | undefined>(undefined);

  const assetMap = useStore((s) => s.rules.assetMaps.assetMap);
  const { data: allWorlds } = useAllWorldsQuery();
  const worldMap = Object.fromEntries((allWorlds ?? []).map((w) => [w.id, w]));
  const worldTruthDefs = useStore((s) => s.rules.worldTruths);
  const createCharacter = useCreateFullCharacterMutation();
  const addCharacterToCampaign = useUpdateCampaignCharacterMutation(
    campaignId ?? undefined
  );

  const { control } = useForm<GuidedForm>();
  const { append } = useFieldArray({
    control,
    name: "assets",
    keyName: "hook-form-id",
  });

  // Campaign context
  const { data: campaign } = useCampaignQuery(campaignId ?? undefined);

  const campaignWorldId = campaign?.worldId ?? null;
  const campaignWorld = campaignWorldId ? worldMap[campaignWorldId] : null;

  // World selection state
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [worldContext, setWorldContext] = useState<WorldContext | undefined>(undefined);

  // Auto-select the campaign's world when it becomes available
  useEffect(() => {
    if (campaignWorldId) {
      handleWorldChange(campaignWorldId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignWorldId]);

  const handleWorldChange = async (worldId: string | null) => {
    setSelectedWorldId(worldId);
    if (!worldId) {
      setWorldContext(undefined);
      return;
    }
    const world = worldMap[worldId];
    const newTruths = world?.newTruths ?? {};

    const truths = Object.keys(worldTruthDefs)
      .map((key) => {
        const truthDef = worldTruthDefs[key];
        const selection = newTruths[key];
        if (!selection) return null;
        let description: string;
        if (selection.selectedTruthOptionIndex === CUSTOM_TRUTH_INDEX) {
          description = selection.customTruth?.description ?? "";
        } else {
          description =
            truthDef.options[selection.selectedTruthOptionIndex ?? 0]
              ?.description ?? "";
        }
        return description ? { name: truthDef.name, description } : null;
      })
      .filter((t): t is { name: string; description: string } => t !== null);

    const aiSettings = await api
      .get<WorldAiSettings>(`/api/worlds/${worldId}/ai-settings`)
      .catch(() => undefined);
    setWorldContext({ truths, assumptions: aiSettings?.assumptions });
  };

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
    callsign: string;
    characteristics: string;
    role: string;
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
    callsign: "",
    characteristics: "",
    role: "",
  });

  const advance = () => setActiveStep((s) => s + 1);
  const goBack = () => setActiveStep((s) => s - 1);

  const handlePathsComplete = (assets: AssetDocument[], role: string) => {
    assets.forEach((a) => append(a));
    setCompletedPathNames(
      assets.map((a) => assetMap[a.id]?.name ?? "").filter(Boolean)
    );
    setFormData((prev) => ({ ...prev, assets: [...prev.assets, ...assets], role }));
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
    setCompletedFinalAssetName(assetMap[asset.id]?.name ?? undefined);
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

  const handleNameComplete = (name: string, callsign: string, characteristics: string) => {
    setFormData((prev) => ({ ...prev, name, callsign, characteristics }));
    advance();
  };

  const saveSummaryNote = (
    characterId: string,
    data: {
      backstory: string;
      look: string;
      act: string;
      wear: string;
    }
  ) => {
    const nodes: object[] = [];

    if (data.backstory) {
      nodes.push({
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Backstory" }],
      });
      nodes.push({
        type: "paragraph",
        content: [{ type: "text", text: data.backstory }],
      });
    }

    if (data.look || data.act || data.wear) {
      nodes.push({
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Appearance" }],
      });
      if (data.look)
        nodes.push({
          type: "paragraph",
          content: [{ type: "text", text: `Look: ${data.look}` }],
        });
      if (data.act)
        nodes.push({
          type: "paragraph",
          content: [{ type: "text", text: `Act: ${data.act}` }],
        });
      if (data.wear)
        nodes.push({
          type: "paragraph",
          content: [{ type: "text", text: `Wear: ${data.wear}` }],
        });
    }

    const tiptapJson = { type: "doc", content: nodes };
    const ydoc = TiptapTransformer.toYdoc(tiptapJson, "default");
    const content = Y.encodeStateAsUpdate(ydoc);
    return api
      .post<{ id: string }>(`/api/notes?entityType=character&entityId=${characterId}`, {
        title: "Character Summary",
        sortOrder: 0,
        shared: false,
      })
      .then((row) =>
        api.patch<void>(`/api/notes/${row.id}`, {
          title: "Character Summary",
          content: Array.from(content),
        })
      );
  };

  const handleAccept = () => {
    setLoading(true);
    createCharacter
      .mutateAsync({
        name: formData.name,
        stats: formData.stats,
        assets: formData.assets,
        portrait: formData.portrait,
        backstory: formData.backstory || undefined,
        backgroundVow: formData.backgroundVow || undefined,
        pronouns: formData.pronouns || undefined,
        callsign: formData.callsign || undefined,
        characteristics: formData.characteristics || undefined,
        role: formData.role || undefined,
      })
      .then((characterId) => {
        const afterSummary = () => {
          if (campaignId) {
            addCharacterToCampaign
              .mutateAsync({ characterId })
              .then(() =>
                queryClient.invalidateQueries({
                  queryKey: campaignKeys.detail(campaignId),
                })
              )
              .finally(() => {
                navigate(
                  constructCampaignSheetPath(campaignId, CAMPAIGN_ROUTES.SHEET)
                );
              });
          } else {
            navigate(constructCharacterSheetPath(characterId));
          }
        };

        if (
          formData.backstory ||
          formData.look ||
          formData.act ||
          formData.wear
        ) {
          saveSummaryNote(characterId, {
            backstory: formData.backstory,
            look: formData.look,
            act: formData.act,
            wear: formData.wear,
          })
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

  const worldOptions = Object.entries(worldMap);

  return (
    <>
      <Head
        title={"Guided Character Creation"}
        description={`Create a character on ${appName}`}
      />
      <PageHeader label={"Guided Character Creation"} />
      <PageContent isPaper>
        {campaign && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: "background.default",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              Creating character for campaign
            </Typography>
            <Typography variant="h6">{campaign.name}</Typography>
            {campaignWorld && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                World: {campaignWorld.name}
              </Typography>
            )}
          </Box>
        )}

        {worldOptions.length > 0 && !campaignWorldId && (
          <FormControl size="small" sx={{ mb: 3, minWidth: 280 }}>
            <InputLabel>World (optional)</InputLabel>
            <Select
              value={selectedWorldId ?? ""}
              onChange={(e) => handleWorldChange(e.target.value || null)}
              label="World (optional)"
            >
              <MenuItem value="">None</MenuItem>
              {worldOptions.map(([id, world]) => (
                <MenuItem key={id} value={id}>
                  {world.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              World truths and assumptions will guide AI suggestions
            </FormHelperText>
          </FormControl>
        )}

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
              <ChoosePathsStep
                onComplete={handlePathsComplete}
                worldContext={worldContext}
              />
            )}
            {activeStep === 1 && (
              <CreateBackstoryStep
                onComplete={handleBackstoryComplete}
                pathNames={completedPathNames}
                role={formData.role || undefined}
                worldContext={worldContext}
              />
            )}
            {activeStep === 2 && (
              <CreateBackgroundVowStep
                onComplete={handleVowComplete}
                pathNames={completedPathNames}
                backstory={completedBackstory}
                role={formData.role || undefined}
                worldContext={worldContext}
              />
            )}
            {activeStep === 3 && (
              <ChooseFinalAssetStep
                onComplete={handleFinalAssetComplete}
                pathNames={completedPathNames}
                backstory={completedBackstory}
                backgroundVow={completedBackgroundVow}
                worldContext={worldContext}
              />
            )}
            {activeStep === 4 && (
              <SetStatsStep
                onComplete={handleStatsComplete}
                pathNames={completedPathNames}
                backstory={completedBackstory}
                backgroundVow={completedBackgroundVow}
                finalAsset={completedFinalAssetName}
                initialStats={
                  Object.keys(formData.stats).length > 0
                    ? formData.stats
                    : undefined
                }
                worldContext={worldContext}
              />
            )}
            {activeStep === 5 && (
              <EnvisionCharacterStep
                onComplete={handleEnvisionComplete}
                pathNames={completedPathNames}
                backstory={completedBackstory}
                backgroundVow={completedBackgroundVow}
                role={formData.role || undefined}
                initialLook={formData.look || undefined}
                initialAct={formData.act || undefined}
                initialWear={formData.wear || undefined}
                initialPronouns={formData.pronouns || undefined}
                worldContext={worldContext}
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
                worldContext={worldContext}
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
