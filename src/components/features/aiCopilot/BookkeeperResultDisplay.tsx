import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState } from "react";
import { BookkeeperOutput } from "types/AI.type";
import { BookkeeperApplyPayload } from "stores/ai/ai.slice.type";
import { useApplyBookkeeperSuggestion } from "hooks/useApplyBookkeeperSuggestion";

interface BookkeeperResultDisplayProps {
  output: BookkeeperOutput;
}

type AppliedSet = Set<string>;

function makeKey(section: string, index: number) {
  return `${section}-${index}`;
}

export function BookkeeperResultDisplay({
  output,
}: BookkeeperResultDisplayProps) {
  const [applied, setApplied] = useState<AppliedSet>(new Set());
  const [applying, setApplying] = useState<string | null>(null);
  const applyBookkeeperSuggestion = useApplyBookkeeperSuggestion();

  const handleApply = async (key: string, payload: BookkeeperApplyPayload) => {
    setApplying(key);
    try {
      await applyBookkeeperSuggestion(payload);
      setApplied((prev) => new Set(prev).add(key));
    } finally {
      setApplying(null);
    }
  };

  const hasContent =
    output.vowUpdates.length > 0 ||
    output.npcUpdates.length > 0 ||
    output.locationUpdates.length > 0 ||
    output.newNPCs.length > 0 ||
    output.canonFacts.length > 0;

  if (!hasContent) {
    return (
      <Typography variant="body2" color="text.secondary" fontStyle="italic">
        No structured updates found.
      </Typography>
    );
  }

  return (
    <Box>
      {output.vowUpdates.length > 0 && (
        <Accordion disableGutters defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600}>
              Vow Updates ({output.vowUpdates.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={1}>
              {output.vowUpdates.map((v, i) => {
                const key = makeKey("vow", i);
                const isApplied = applied.has(key);
                return (
                  <Stack
                    key={key}
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                  >
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={500}>
                        {v.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Progress → {v.suggestedProgress}/10
                        {v.notes ? ` — ${v.notes}` : ""}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant={isApplied ? "text" : "outlined"}
                      color={isApplied ? "success" : "primary"}
                      disabled={isApplied || applying === key}
                      onClick={() =>
                        handleApply(key, { type: "vowUpdate", data: v })
                      }
                      sx={{ flexShrink: 0 }}
                    >
                      {isApplied ? "Applied" : "Apply"}
                    </Button>
                  </Stack>
                );
              })}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {output.npcUpdates.length > 0 && (
        <Accordion disableGutters defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600}>
              NPC Updates ({output.npcUpdates.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={1}>
              {output.npcUpdates.map((n, i) => {
                const key = makeKey("npc", i);
                const isApplied = applied.has(key);
                const changes = Object.entries(n.changes)
                  .filter(([, v]) => v !== null)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ");
                return (
                  <Stack
                    key={key}
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                  >
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={500}>
                        {n.name}
                      </Typography>
                      {changes && (
                        <Typography variant="caption" color="text.secondary">
                          {changes}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      size="small"
                      variant={isApplied ? "text" : "outlined"}
                      color={isApplied ? "success" : "primary"}
                      disabled={isApplied || applying === key}
                      onClick={() =>
                        handleApply(key, { type: "npcUpdate", data: n })
                      }
                      sx={{ flexShrink: 0 }}
                    >
                      {isApplied ? "Applied" : "Apply"}
                    </Button>
                  </Stack>
                );
              })}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {output.newNPCs.length > 0 && (
        <Accordion disableGutters defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600}>
              New NPCs ({output.newNPCs.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={1}>
              {output.newNPCs.map((n, i) => {
                const key = makeKey("newNpc", i);
                const isApplied = applied.has(key);
                const details = [n.role, n.disposition]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <Stack
                    key={key}
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                  >
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={500}>
                        {n.name}
                      </Typography>
                      {details && (
                        <Typography variant="caption" color="text.secondary">
                          {details}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      size="small"
                      variant={isApplied ? "text" : "outlined"}
                      color={isApplied ? "success" : "primary"}
                      disabled={isApplied || applying === key}
                      onClick={() =>
                        handleApply(key, { type: "newNPC", data: n })
                      }
                      sx={{ flexShrink: 0 }}
                    >
                      {isApplied ? "Created" : "Create"}
                    </Button>
                  </Stack>
                );
              })}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {output.locationUpdates.length > 0 && (
        <Accordion disableGutters defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600}>
              Location Updates ({output.locationUpdates.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={1}>
              {output.locationUpdates.map((l, i) => {
                const key = makeKey("loc", i);
                const isApplied = applied.has(key);
                const changes = Object.entries(l.changes)
                  .filter(([, v]) => v !== null)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ");
                return (
                  <Stack
                    key={key}
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                  >
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={500}>
                        {l.name}
                      </Typography>
                      {changes && (
                        <Typography variant="caption" color="text.secondary">
                          {changes}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      size="small"
                      variant={isApplied ? "text" : "outlined"}
                      color={isApplied ? "success" : "primary"}
                      disabled={isApplied || applying === key}
                      onClick={() =>
                        handleApply(key, { type: "locationUpdate", data: l })
                      }
                      sx={{ flexShrink: 0 }}
                    >
                      {isApplied ? "Applied" : "Apply"}
                    </Button>
                  </Stack>
                );
              })}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {output.canonFacts.length > 0 && (
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600}>
              Canon Facts ({output.canonFacts.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {output.canonFacts.map((fact, i) => (
                <Chip key={i} label={fact} size="small" variant="outlined" />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}
