import { Box, Chip, CircularProgress, Divider, IconButton, Tooltip, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { MoveSessionEvent } from "types/SessionLog.type";
import { ROLL_RESULT } from "types/DieRolls.type";
import { useStore } from "stores/store";

export interface MoveEventCardProps {
  event: MoveSessionEvent;
  onRequestNarrative?: () => void;
  streamingNarrative?: string;
}

function getOutcomeLabel(outcome: ROLL_RESULT): string {
  switch (outcome) {
    case ROLL_RESULT.HIT:
      return "Strong Hit";
    case ROLL_RESULT.WEAK_HIT:
      return "Weak Hit";
    case ROLL_RESULT.MISS:
      return "Miss";
    default:
      return "Unknown";
  }
}

function getOutcomeColor(
  outcome: ROLL_RESULT
): "success" | "warning" | "error" {
  switch (outcome) {
    case ROLL_RESULT.HIT:
      return "success";
    case ROLL_RESULT.WEAK_HIT:
      return "warning";
    case ROLL_RESULT.MISS:
      return "error";
    default:
      return "error";
  }
}

export function MoveEventCard({
  event,
  onRequestNarrative,
  streamingNarrative,
}: MoveEventCardProps) {
  const currentUid = useStore((s) => s.auth.uid);
  const activeSessionId = useStore((s) => s.sessionLog.activeSessionId);

  const showGuideButton =
    !!onRequestNarrative &&
    event.uid === currentUid &&
    !!activeSessionId &&
    !event.narrative &&
    !streamingNarrative;

  const narrativeToShow = streamingNarrative ?? event.narrative;
  const isStreaming = !!streamingNarrative;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
        <Typography variant="body2" fontWeight="bold" sx={{ flexGrow: 1 }}>
          {event.moveName}
        </Typography>
        <Chip
          label={getOutcomeLabel(event.outcome)}
          size="small"
          color={getOutcomeColor(event.outcome)}
          sx={{ height: 20, fontSize: "0.7rem" }}
        />
        {showGuideButton && (
          <Tooltip title="Ask the Guide">
            <IconButton
              size="small"
              onClick={onRequestNarrative}
              sx={{ p: 0.25 }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {event.playerContext && (
        <Typography
          variant="body2"
          color="textSecondary"
          fontStyle="italic"
          mb={0.5}
        >
          &ldquo;{event.playerContext}&rdquo;
        </Typography>
      )}
      <Typography variant="caption" color="textSecondary">
        Action: {event.action} + {event.stat} {event.statValue} ={" "}
        {event.score} vs [{event.challengeDice[0]}] [{event.challengeDice[1]}]
      </Typography>
      {narrativeToShow && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box display="flex" alignItems="flex-start" gap={0.75}>
            <AutoAwesomeIcon
              sx={(theme) => ({
                fontSize: 14,
                mt: 0.25,
                color: theme.palette.primary.main,
                flexShrink: 0,
              })}
            />
            <Box flexGrow={1}>
              <Typography
                variant="body2"
                sx={{ fontStyle: "italic", whiteSpace: "pre-wrap" }}
              >
                {narrativeToShow}
                {isStreaming && (
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "2px",
                      height: "1em",
                      backgroundColor: "currentColor",
                      ml: 0.25,
                      verticalAlign: "text-bottom",
                      animation: "blink 1s step-end infinite",
                      "@keyframes blink": {
                        "0%, 100%": { opacity: 1 },
                        "50%": { opacity: 0 },
                      },
                    }}
                  />
                )}
              </Typography>
            </Box>
            {isStreaming && (
              <CircularProgress size={14} sx={{ mt: 0.25, flexShrink: 0 }} />
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
