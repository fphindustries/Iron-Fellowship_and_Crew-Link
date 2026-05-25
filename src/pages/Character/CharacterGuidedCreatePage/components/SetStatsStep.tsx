import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useState } from "react";
import { useStore } from "stores/store";
import { useAiGuide } from "hooks/featureFlags/useAiCopilot";
import { StatInput } from "pages/Character/CharacterCreatePage/components/StatInput";
import { recommendStatAllocation } from "api/ai/recommendStatAllocation";
import { WorldContext } from "types/AI.type";

const STANDARD_ARRAY = [3, 2, 2, 1, 1];

export interface SetStatsStepProps {
  onComplete: (stats: Record<string, number>) => void;
  pathNames: string[];
  backstory: string;
  backgroundVow: string;
  finalAsset?: string;
  initialStats?: Record<string, number>;
  worldContext?: WorldContext;
}

export function SetStatsStep({
  onComplete,
  pathNames,
  backstory,
  backgroundVow,
  finalAsset,
  initialStats,
  worldContext,
}: SetStatsStepProps) {
  const showAi = useAiGuide();
  const stats = useStore((store) => store.rules.stats);

  const numberOfStats = Object.keys(stats).length;
  const canUseStandardArray = numberOfStats === STANDARD_ARRAY.length;
  const hasInitial = initialStats && Object.keys(initialStats).length > 0;
  const [usingStandardArray, setUsingStandardArray] = useState(!hasInitial);
  const showStandardArrayInputs = canUseStandardArray && usingStandardArray;

  const [statValues, setStatValues] = useState<Record<string, number | undefined>>(
    () => initialStats ?? {}
  );
  const [statsRemainingTracker, setStatsRemainingTracker] = useState<number[]>(() => {
    if (!hasInitial) return [...STANDARD_ARRAY];
    // All values were used from initial stats
    return [];
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  const canConfirm = Object.keys(stats).every(
    (key) => typeof statValues[key] === "number"
  );

  const handleRemainingOptionsChange = (
    previousValue: number | undefined,
    newValue: number | undefined
  ) => {
    setStatsRemainingTracker((prev) => {
      const next = [...prev];
      if (typeof previousValue === "number") {
        next.push(previousValue);
        next.sort((a, b) => b - a);
      }
      if (typeof newValue === "number") {
        const idx = next.indexOf(newValue);
        next.splice(idx, 1);
      }
      return next;
    });
  };

  const handleToggleCustomStats = () => {
    setStatValues({});
    setStatsRemainingTracker([...STANDARD_ARRAY]);
    setAiReasoning(null);
    setUsingStandardArray((prev) => !prev);
  };

  const handleRecommend = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiReasoning(null);
    try {
      const statEntries = Object.entries(stats).map(([key, stat]) => ({
        key,
        label: stat.label,
        description: stat.description ?? "",
      }));
      const result = await recommendStatAllocation({
        paths: pathNames,
        backstory,
        backgroundVow,
        stats: statEntries,
        finalAsset,
        worldContext,
      });
      if (result?.allocations) {
        const newValues: Record<string, number | undefined> = {};
        result.allocations.forEach(({ statKey, value }) => {
          newValues[statKey] = value;
        });
        setStatValues(newValues);
        setStatsRemainingTracker([]);
        setAiReasoning(result.reasoning ?? null);
        // Switch to standard array mode so dropdowns show pre-filled values
        if (!usingStandardArray) {
          setUsingStandardArray(true);
        }
      }
    } catch {
      setAiError("Failed to get stat recommendations. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirm = () => {
    const finalStats: Record<string, number> = {};
    for (const key of Object.keys(stats)) {
      finalStats[key] = statValues[key] as number;
    }
    onComplete(finalStats);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Set Your Stats
      </Typography>

      <Box display="flex" alignItems="baseline" gap={1} mb={1}>
        <Typography color="text.secondary">
          {showStandardArrayInputs
            ? "Select a number 1–3 for each stat."
            : "Enter a number for each stat."}
        </Typography>
        {canUseStandardArray && (
          <Link
            component="button"
            type="button"
            color="inherit"
            variant="inherit"
            onClick={handleToggleCustomStats}
          >
            {showStandardArrayInputs
              ? "Use custom stat values."
              : "Use standard stats instead."}
          </Link>
        )}
      </Box>

      <Box display="flex" flexWrap="wrap" mb={2}>
        {Object.keys(stats).map((statKey) => (
          <StatInput
            key={statKey}
            label={stats[statKey].label}
            description={stats[statKey].description}
            value={statValues[statKey]}
            updateValue={(value) =>
              setStatValues((prev) => ({ ...prev, [statKey]: value }))
            }
            remainingOptions={statsRemainingTracker}
            handleRemainingOptionsChange={handleRemainingOptionsChange}
            allowAnyNumber={!showStandardArrayInputs}
          />
        ))}
      </Box>

      {showAi && (
        <Button
          variant="outlined"
          startIcon={
            aiLoading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />
          }
          onClick={handleRecommend}
          disabled={aiLoading}
          sx={{ mb: 2 }}
        >
          {aiLoading ? "Recommending…" : "Recommend Stats"}
        </Button>
      )}

      {aiError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {aiError}
        </Alert>
      )}

      {aiReasoning && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {aiReasoning}
        </Typography>
      )}

      <Button
        variant="contained"
        onClick={handleConfirm}
        disabled={!canConfirm}
      >
        Confirm Stats
      </Button>
    </Box>
  );
}
