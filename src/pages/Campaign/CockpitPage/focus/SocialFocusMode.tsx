import { Box, Typography } from "@mui/material";
import { useStore } from "stores/store";
import { FocusMoveChip, FocusMoveGroup } from "./FocusMoveChip";
import { KnowledgeBadge } from "../shared/KnowledgeBadge";

const SOCIAL_MOVES = [
  { id: "starforged/moves/adventure/compel", intent: "Convince or negotiate", color: "secondary" as const },
  { id: "starforged/moves/adventure/gather_information", intent: "Learn what they know" },
  { id: "starforged/moves/adventure/secure_an_advantage", intent: "Improve your position" },
];

export function SocialFocusMode() {
  const npcIntents = useStore((store) => store.aiGuide.state?.npcIntents ?? {});
  const activeNPCs = Object.entries(npcIntents);

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography variant="subtitle2" color="secondary.main" sx={{ mb: 0.5 }}>
          Social
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Navigate the interaction. Watch what you reveal.
        </Typography>
      </Box>

      {activeNPCs.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mb={0.75}
            sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            Present NPCs
          </Typography>
          <Box display="flex" flexDirection="column" gap={0.75}>
            {activeNPCs.map(([name, intent]) => {
              const knowledge =
                !intent.firstImpressionRevealed
                  ? "hidden"
                  : intent.hiddenAspects.length > 0
                  ? "suspected"
                  : "known";
              return (
                <Box
                  key={name}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <Box flex={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={0.75} mb={0.25}>
                      <Typography variant="subtitle2" noWrap>
                        {name}
                      </Typography>
                      <KnowledgeBadge knowledge={knowledge} />
                    </Box>
                    {intent.firstImpressionRevealed && intent.currentIntent && (
                      <Typography variant="caption" color="text.secondary">
                        {intent.currentIntent}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      <FocusMoveGroup label="Moves">
        {SOCIAL_MOVES.map((m) => (
          <FocusMoveChip
            key={m.id}
            moveId={m.id}
            intent={m.intent}
            color={m.color}
          />
        ))}
      </FocusMoveGroup>
    </Box>
  );
}
