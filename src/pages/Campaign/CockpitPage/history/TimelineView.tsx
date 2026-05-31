import { Box, Chip, CircularProgress, Typography } from "@mui/material";
import { useStore } from "stores/store";
import { useSceneEventsQuery } from "hooks/queries/useSceneEventsQuery";

const EVENT_LABELS: Record<string, string> = {
  narration: "Narration",
  player_action: "Action",
  move_roll: "Move",
  oracle: "Oracle",
  tracker_update: "Tracker",
  canon_update: "Canon",
  npc_update: "NPC",
  scene_change: "Scene",
  ai_message: "Guide",
};

const EVENT_COLORS: Record<string, "default" | "primary" | "warning" | "success" | "info"> = {
  narration: "default",
  player_action: "primary",
  move_roll: "warning",
  oracle: "info",
  canon_update: "success",
  ai_message: "primary",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function TimelineView() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const { data: events, isLoading } = useSceneEventsQuery(campaignId);

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1} py={2}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading timeline…
        </Typography>
      </Box>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled" py={2}>
        No events recorded yet. Events appear here as you play.
      </Typography>
    );
  }

  return (
    <Box>
      {events.map((event) => {
        const payload = event.payloadJson as Record<string, unknown>;
        const text =
          getPayloadText(payload, "narrative") ||
          getPayloadText(payload, "content") ||
          getPayloadText(payload, "moveName") ||
          null;

        return (
          <Box
            key={event.id}
            sx={{
              display: "flex",
              gap: 1.5,
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
              "&:last-child": { borderBottom: 0 },
            }}
          >
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ minWidth: 40, flexShrink: 0, pt: 0.25 }}
            >
              {formatTime(event.createdAt)}
            </Typography>
            <Box flex={1} minWidth={0}>
              <Box display="flex" alignItems="center" gap={0.75} mb={text ? 0.25 : 0}>
                <Chip
                  label={EVENT_LABELS[event.type] ?? event.type}
                  size="small"
                  color={EVENT_COLORS[event.type] ?? "default"}
                  variant="outlined"
                  sx={{ fontSize: 10, height: 18 }}
                />
                {event.actorId && event.actorId !== "ai-guide" && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {event.actorId}
                  </Typography>
                )}
              </Box>
              {text && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.4,
                  }}
                >
                  {text}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function getPayloadText(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}
