import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AiEventDocument, AiEventStatus } from "types/AI.type";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AiStatusBadge } from "./AiStatusBadge";
import { BookkeeperResultDisplay } from "./BookkeeperResultDisplay";
import { AiContextPreview } from "./AiContextPreview";

interface AiSuggestionCardProps {
  eventId: string;
  event: AiEventDocument;
  campaignId: string;
  onUpdateStatus: (
    eventId: string,
    status: AiEventStatus,
    editedText?: string
  ) => void;
}

const MODE_LABELS: Record<string, string> = {
  storyGenerator: "Story",
  stuckPlayer: "Unstuck",
  actionElaborator: "Action",
  sessionRecap: "Recap",
  bookkeeper: "Bookkeeper",
};

export function AiSuggestionCard({
  eventId,
  event,
  onUpdateStatus,
}: AiSuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(event.response.text ?? "");

  const isPending = event.status === "pending";
  const text = event.response.text;
  const isStructured = !!event.response.bookkeeper;

  const handleAccept = () => {
    onUpdateStatus(eventId, "accepted");
  };

  const handleReject = () => {
    onUpdateStatus(eventId, "rejected");
  };

  const handleEditSave = () => {
    onUpdateStatus(eventId, "edited", editValue);
    setIsEditing(false);
  };

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ pb: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          mb={1}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {MODE_LABELS[event.type] ?? event.type}
          </Typography>
          <AiStatusBadge status={event.status} />
          <Typography variant="caption" color="text.secondary" ml="auto">
            {event.createdAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
        </Stack>

        {isEditing ? (
          <TextField
            multiline
            fullWidth
            minRows={4}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            size="small"
          />
        ) : (
          <Box
            sx={{
              "& p": { mt: 0, mb: 1 },
              "& ul, & ol": { mt: 0, mb: 1, pl: 2 },
              "& li": { mb: 0.5 },
              fontSize: "0.875rem",
            }}
          >
            {text ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            ) : event.response.bookkeeper ? (
              <BookkeeperResultDisplay output={event.response.bookkeeper} />
            ) : (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                No content available.
              </Typography>
            )}
          </Box>
        )}
        <AiContextPreview contextSnapshot={event.contextSnapshot} />
      </CardContent>

      {isPending && !isStructured && (
        <CardActions sx={{ pt: 0, flexWrap: "wrap", gap: 0.5 }}>
          {isEditing ? (
            <>
              <Button size="small" variant="contained" onClick={handleEditSave}>
                Save
              </Button>
              <Button size="small" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="small" color="success" onClick={handleAccept}>
                Accept
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setEditValue(text ?? "");
                  setIsEditing(true);
                }}
                disabled={!text}
              >
                Edit
              </Button>
              <Button size="small" color="error" onClick={handleReject}>
                Reject
              </Button>
            </>
          )}
        </CardActions>
      )}
    </Card>
  );
}
