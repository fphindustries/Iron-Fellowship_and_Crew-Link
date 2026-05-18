import { Alert, Button, CircularProgress, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { SectionHeading } from "components/shared/SectionHeading";
import { WorldNameSection } from "pages/World/WorldSheetPage/components/WorldNameSection";
import { useStore } from "stores/store";
import { RtcRichTextEditor } from "components/shared/RichTextEditor/RtcRichTextEditor";
import { useCallback, useState } from "react";
import { WorldTruths } from "./WorldTruths";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";
import { generateWorldDescription } from "api/ai/generateWorldDescription";
import { TiptapTransformer } from "@hocuspocus/transformer";
import * as Y from "yjs";
import { CUSTOM_TRUTH_INDEX } from "./WorldTruths/customTruthIndex";

export interface WorldSheetProps {
  canEdit: boolean;
  hideCampaignHints?: boolean;
}

export function WorldSheet(props: WorldSheetProps) {
  const { canEdit, hideCampaignHints } = props;

  const world = useStore((store) => store.worlds.currentWorld.currentWorld);
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const worldTruths = useStore((store) => store.rules.worldTruths);
  const worldAiSettings = useStore(
    (store) => store.worlds.currentWorld.worldAiSettings
  );

  const updateWorldDescription = useStore(
    (store) => store.worlds.currentWorld.updateCurrentWorldDescription
  );

  const updateWorldDescriptionCallback = useCallback(
    (documentId: string, content: Uint8Array, isBeaconRequest?: boolean) =>
      worldId
        ? updateWorldDescription(worldId, content, isBeaconRequest)
        : new Promise<void>((res) => res()),
    [updateWorldDescription, worldId]
  );

  const showAi = useAiGuide();
  const [generating, setGenerating] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const handleGenerateDescription = async () => {
    if (!world || !worldId) return;

    const truthSelections = world.newTruths ?? {};
    const selectedTruths = Object.keys(worldTruths)
      .map((key) => {
        const truth = worldTruths[key];
        const selection = truthSelections[key];
        if (!selection) return null;
        let description: string;
        if (selection.selectedTruthOptionIndex === CUSTOM_TRUTH_INDEX) {
          description = selection.customTruth?.description ?? "";
        } else {
          description =
            truth.options[selection.selectedTruthOptionIndex ?? 0]
              ?.description ?? "";
        }
        return { name: truth.name, description };
      })
      .filter((t): t is { name: string; description: string } => t !== null && t.description.length > 0);

    setGenerating(true);
    try {
      const result = await generateWorldDescription({
        worldName: world.name,
        truths: selectedTruths,
        assumptions: worldAiSettings?.assumptions,
        worldTonePrompt: worldAiSettings?.worldTonePrompt,
      });

      if (result?.description) {
        const paragraphs = result.description
          .split(/\n\n+/)
          .filter(Boolean)
          .map((text) => ({
            type: "paragraph",
            content: [{ type: "text", text }],
          }));
        const tiptapJson = { type: "doc", content: paragraphs };
        const ydoc = TiptapTransformer.toYdoc(tiptapJson, "default");
        const bytes = Y.encodeStateAsUpdate(ydoc);
        await updateWorldDescription(worldId, bytes);
        setEditorKey((k) => k + 1);
      }
    } finally {
      setGenerating(false);
    }
  };

  if (!world || !worldId) return null;

  return (
    <>
      {canEdit ? (
        <WorldNameSection />
      ) : (
        <Typography
          variant={"h5"}
          sx={(theme) => ({ py: 2, fontFamily: theme.fontFamilyTitle })}
        >
          {world.name}
        </Typography>
      )}
      {(canEdit || world.worldDescription) && (
        <>
          <SectionHeading
            breakContainer
            label={"World Description"}
            sx={{ mt: canEdit ? 4 : 0, mb: 2 }}
            action={
              canEdit && showAi ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={
                    generating ? (
                      <CircularProgress size={14} />
                    ) : (
                      <AutoAwesomeIcon fontSize="small" />
                    )
                  }
                  onClick={handleGenerateDescription}
                  disabled={generating}
                >
                  {generating ? "Generating…" : "Generate Description"}
                </Button>
              ) : undefined
            }
          />
          {canEdit && !hideCampaignHints && (
            <Alert severity={"info"} sx={{ mb: 2 }}>
              If you add this world to your campaign, this information will be
              shared with your players.
            </Alert>
          )}
          <RtcRichTextEditor
            key={editorKey}
            id={worldId}
            roomPrefix={`worlds-${worldId}-description-`}
            documentPassword={worldId}
            onSave={canEdit ? updateWorldDescriptionCallback : undefined}
            initialValue={world.worldDescription}
          />
        </>
      )}
      <WorldTruths canEdit={canEdit} hideCampaignHints={hideCampaignHints} />
    </>
  );
}
