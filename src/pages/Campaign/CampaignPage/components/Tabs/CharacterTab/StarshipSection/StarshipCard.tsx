import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { CampaignStarship } from "hooks/queries/useCampaignsQuery";

export interface StarshipCardProps {
  starship: CampaignStarship;
  onEdit: () => void;
}

export function StarshipCard({ starship, onEdit }: StarshipCardProps) {
  return (
    <Card variant="outlined" sx={{ width: "100%" }}>
      {starship.image ? (
        <Box
          component="img"
          src={starship.image.url}
          alt={starship.name ?? "Starship"}
          sx={{ width: "100%", display: "block", maxHeight: 240, objectFit: "cover" }}
        />
      ) : (
        <Box
          sx={{
            height: 120,
            bgcolor: "background.default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RocketLaunchIcon sx={{ fontSize: 48, color: "text.disabled" }} />
        </Box>
      )}
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="overline" color="text.secondary" lineHeight={1}>
              Starship
            </Typography>
            <Typography variant="h6" lineHeight={1.2}>
              {starship.name || "Unnamed Ship"}
            </Typography>
          </Box>
          <Tooltip title="Edit starship">
            <IconButton size="small" onClick={onEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {starship.history && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {starship.history}
          </Typography>
        )}

        {starship.quirks.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1.5 }}>
            {starship.quirks.map((q, i) => (
              <Chip key={i} label={q} size="small" />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
