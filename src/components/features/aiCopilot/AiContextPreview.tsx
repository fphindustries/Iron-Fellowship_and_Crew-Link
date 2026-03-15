import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { AiCampaignContext } from "api-calls/ai/_ai.type";

interface AiContextPreviewProps {
  contextSnapshot: Partial<AiCampaignContext>;
}

export function AiContextPreview({ contextSnapshot }: AiContextPreviewProps) {
  const {
    gameSystem,
    campaignName,
    campaignType,
    characters = [],
    activeVows = [],
    activeJourneys = [],
    currentLocation,
    currentNPCs = [],
    noteText,
    freeformInput,
  } = contextSnapshot;

  return (
    <Accordion
      disableGutters
      sx={{
        "&:before": { display: "none" },
        bgcolor: "action.hover",
        borderRadius: 1,
        mt: 1,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{ minHeight: 32, "& .MuiAccordionSummary-content": { my: 0.5 } }}
      >
        <Typography variant="caption" color="text.secondary">
          Context sent to AI
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Stack spacing={0.75}>
          {campaignName && (
            <Row label="Campaign">
              {campaignName}
              {gameSystem && (
                <Chip
                  label={gameSystem}
                  size="small"
                  sx={{ ml: 0.5, height: 16, fontSize: "0.65rem" }}
                />
              )}
              {campaignType && (
                <Chip
                  label={campaignType}
                  size="small"
                  variant="outlined"
                  sx={{ ml: 0.5, height: 16, fontSize: "0.65rem" }}
                />
              )}
            </Row>
          )}

          {characters.length > 0 && (
            <Row label="Characters">
              {characters.map((c, i) => (
                <Box key={i}>
                  <Typography
                    variant="caption"
                    component="span"
                    fontWeight={500}
                  >
                    {c.name}
                  </Typography>
                  {" — "}
                  <Typography variant="caption" color="text.secondary">
                    momentum: {c.momentum}
                    {Object.entries(c.stats ?? {})
                      .map(([k, v]) => `, ${k}: ${v}`)
                      .join("")}
                  </Typography>
                </Box>
              ))}
            </Row>
          )}

          {activeVows.length > 0 && (
            <Row label="Active vows">
              {activeVows.map((v, i) => (
                <Typography key={i} variant="caption" display="block">
                  &ldquo;{v.label}&rdquo; — {v.difficulty}, {v.value}/10
                </Typography>
              ))}
            </Row>
          )}

          {activeJourneys.length > 0 && (
            <Row label="Journeys">
              {activeJourneys.map((j, i) => (
                <Typography key={i} variant="caption" display="block">
                  &ldquo;{j.label}&rdquo; — {j.difficulty}, {j.value}/10
                </Typography>
              ))}
            </Row>
          )}

          {currentLocation && (
            <Row label="Location">{currentLocation.name}</Row>
          )}

          {currentNPCs.length > 0 && (
            <Row label="NPCs">
              {currentNPCs.map((n, i) => (
                <Typography key={i} variant="caption" display="block">
                  {n.name}
                  {n.role ? ` (${n.role})` : ""}
                </Typography>
              ))}
            </Row>
          )}

          {noteText && (
            <Row label="Note">
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {noteText}
              </Typography>
            </Row>
          )}

          {freeformInput && (
            <Row label="Input">
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {freeformInput}
              </Typography>
            </Row>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ minWidth: 72, flexShrink: 0, fontWeight: 500 }}
      >
        {label}
      </Typography>
      <Box flex={1}>{children}</Box>
    </Stack>
  );
}
