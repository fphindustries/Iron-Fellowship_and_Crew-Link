import { Box, CircularProgress, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

interface AIGuideNarrativeProps {
  text: string;
}

export function AIGuideNarrative({ text }: AIGuideNarrativeProps) {
  return (
    <Box
      sx={(theme) => ({
        mx: 1,
        my: 0.5,
        px: 1.5,
        py: 1,
        borderLeft: `3px solid ${theme.palette.primary.main}`,
        borderRadius: `0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0`,
        backgroundColor: theme.palette.background.paper,
      })}
    >
      <Box display="flex" alignItems="flex-start" gap={1}>
        <AutoAwesomeIcon
          sx={(theme) => ({
            fontSize: 16,
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
            {text}
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
          </Typography>
        </Box>
        <CircularProgress size={14} sx={{ mt: 0.25, flexShrink: 0 }} />
      </Box>
    </Box>
  );
}
