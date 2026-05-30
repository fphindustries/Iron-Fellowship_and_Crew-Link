import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Tooltip,
  Typography,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useStore } from "stores/store";
import { SpotlightState } from "types/AIGuideState.type";
import { useCockpitAiRequest } from "./useCockpitAiRequest";

interface SpotlightIndicatorProps {
  campaignId: string;
  characterNames: string[];
}

export function SpotlightIndicator({
  campaignId,
  characterNames,
}: SpotlightIndicatorProps) {
  const spotlight = useStore(
    (store) => store.aiGuide.state?.spotlight ?? { recent: [], quiet: [] }
  );
  const setSpotlight = useStore((store) => store.aiGuide.setSpotlight);
  const { request } = useCockpitAiRequest();

  const [nudgeSuggestion, setNudgeSuggestion] = useState<string | null>(null);
  const [isNudging, setIsNudging] = useState(false);

  const handleSetCurrent = async (name: string) => {
    const prev = spotlight.current;
    const newRecent = prev
      ? [prev, ...spotlight.recent.filter((n) => n !== prev)].slice(0, 3)
      : spotlight.recent;
    const newQuiet = characterNames.filter(
      (n) => n !== name && !newRecent.includes(n)
    );
    const updated: SpotlightState = {
      current: name,
      recent: newRecent,
      quiet: newQuiet,
    };
    await setSpotlight(campaignId, updated);
    setNudgeSuggestion(null);
  };

  const handleNudge = async () => {
    if (characterNames.length < 2) return;
    setIsNudging(true);
    setNudgeSuggestion(null);
    try {
      const proposal = await request("spotlightNudge", "");
      const data = proposal?.structuredData as
        | { characterName: string; suggestion: string }
        | undefined;
      if (data?.characterName) {
        setNudgeSuggestion(`${data.characterName}: ${data.suggestion}`);
      }
    } finally {
      setIsNudging(false);
    }
  };

  if (characterNames.length === 0) return null;

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={0.5}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          Spotlight
        </Typography>
        {characterNames.length > 1 && (
          <Tooltip title="AI suggests who to feature next">
            <span>
              <Button
                size="small"
                startIcon={
                  isNudging ? (
                    <CircularProgress size={12} />
                  ) : (
                    <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                  )
                }
                onClick={handleNudge}
                disabled={isNudging}
                sx={{ fontSize: 10, py: 0, px: 0.75, minWidth: 0 }}
              >
                Suggest
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      <Box display="flex" flexWrap="wrap" gap={0.5} sx={{ px: 0.5 }}>
        {characterNames.map((name) => {
          const isCurrent = spotlight.current === name;
          const isQuiet =
            spotlight.quiet.includes(name) ||
            (!isCurrent &&
              !spotlight.recent.includes(name) &&
              spotlight.current !== undefined);
          return (
            <Tooltip
              key={name}
              title={
                isCurrent
                  ? "Currently spotlighted — click to unset"
                  : "Set as spotlight focus"
              }
            >
              <Box
                component="button"
                onClick={async () => {
                  if (isCurrent) {
                    await setSpotlight(campaignId, { ...spotlight, current: undefined });
                  } else {
                    await handleSetCurrent(name);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.4,
                  px: 0.75,
                  py: 0.25,
                  border: "1px solid",
                  borderColor: isCurrent ? "warning.main" : "divider",
                  borderRadius: 1,
                  bgcolor: "transparent",
                  cursor: "pointer",
                  color: isCurrent
                    ? "warning.main"
                    : isQuiet
                    ? "text.disabled"
                    : "text.secondary",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                {isCurrent ? (
                  <StarIcon sx={{ fontSize: 12 }} />
                ) : (
                  <StarBorderIcon sx={{ fontSize: 12 }} />
                )}
                <Typography variant="caption" sx={{ lineHeight: 1 }}>
                  {name}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {nudgeSuggestion && (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{
            mt: 0.75,
            px: 0.5,
            fontStyle: "italic",
            lineHeight: 1.4,
          }}
        >
          {nudgeSuggestion}
        </Typography>
      )}
    </Box>
  );
}
