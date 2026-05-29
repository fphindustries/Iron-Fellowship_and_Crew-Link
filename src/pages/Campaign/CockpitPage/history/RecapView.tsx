import { useState, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useStore } from "stores/store";
import { useGameSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { AiCampaignContext } from "types/AI.type";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { SESSION_EVENT_TYPE, MoveSessionEvent } from "types/SessionLog.type";
import { ROLL_RESULT } from "types/DieRolls.type";
import { CampaignType } from "types/Campaign.type";
import { SessionRecapOutput } from "types/AI.type";

export function RecapView() {
  const { gameSystem } = useGameSystem();
  const requestAi = useStore((store) => store.ai.requestAi);
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );

  const [loading, setLoading] = useState(false);
  const [recap, setRecap] = useState<SessionRecapOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!campaignId) return;

    const store = useStore.getState();
    const campaign = store.campaigns.currentCampaign.currentCampaign;
    const character = store.characters.currentCharacter.currentCharacter;
    const trackMap = store.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active];

    const activeVows = Object.values(trackMap?.[TrackTypes.Vow] ?? {}).map(
      (v) => ({ label: v.label, difficulty: v.difficulty, value: v.value })
    );
    const activeJourneys = Object.values(trackMap?.[TrackTypes.Journey] ?? {}).map(
      (j) => ({ label: j.label, difficulty: j.difficulty, value: j.value })
    );
    const characters = character
      ? [{
          name: character.name,
          stats: character.stats ?? {},
          conditionMeters: character.conditionMeters ?? {},
          momentum: character.momentum ?? 0,
        }]
      : [];
    const recentRolls = Object.values(store.sessionLog.events)
      .filter((e) => e.type === SESSION_EVENT_TYPE.MOVE)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20)
      .map((e) => {
        const m = e as MoveSessionEvent;
        const result =
          m.outcome === ROLL_RESULT.HIT ? "hit" :
          m.outcome === ROLL_RESULT.WEAK_HIT ? "weakHit" : "miss";
        return { label: m.moveName, result: result as "hit" | "weakHit" | "miss" };
      });

    const context: AiCampaignContext = {
      gameSystem: gameSystem === GAME_SYSTEMS.STARFORGED ? "starforged" : "ironsworn",
      campaignName: campaign?.name ?? "Unknown Campaign",
      campaignType: (campaign?.type ?? CampaignType.AIGuided) as "ai-guided",
      activeVows,
      activeJourneys,
      characters,
      recentRolls,
      noteText: store.aiGuide.state?.currentScene?.description,
    };

    setLoading(true);
    setError(null);
    try {
      const response = await requestAi({ mode: "sessionRecap", campaignId, context });
      if (response.recap) {
        setRecap(response.recap);
      }
    } catch {
      setError("Failed to generate recap. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, gameSystem, requestAi]);

  return (
    <Box>
      {!recap && !loading && (
        <Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Generate an AI summary of the current session based on your recent moves and scene context.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleGenerate}
          >
            Generate Recap
          </Button>
        </Box>
      )}

      {loading && (
        <Box display="flex" alignItems="center" gap={1.5} py={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Generating session recap…
          </Typography>
        </Box>
      )}

      {error && (
        <Typography variant="body2" color="error" mt={1}>
          {error}
        </Typography>
      )}

      {recap && (
        <Box>
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {recap.summary}
          </Typography>

          {recap.canonFacts.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" display="block" mb={1} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                Key Facts
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                {recap.canonFacts.map((fact, i) => (
                  <Typography key={i} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {fact}
                  </Typography>
                ))}
              </Box>
            </>
          )}

          <Box mt={2}>
            <Button
              size="small"
              color="inherit"
              onClick={() => setRecap(null)}
            >
              Regenerate
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
