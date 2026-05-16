import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import { useEffect, useState } from "react";
import { useStore } from "stores/store";
import { AssetDocument } from "api-calls/assets/_asset.type";

export interface ReviewFormData {
  assets: AssetDocument[];
  backstory: string;
  backgroundVow: string;
  stats: Record<string, number>;
  portrait?: { image: File; scale: number; position: { x: number; y: number } };
  look: string;
  act: string;
  wear: string;
  role: string;
  pronouns: string;
  name: string;
  callsign: string;
  characteristics: string;
}

export interface ReviewStepProps {
  formData: ReviewFormData;
  onAccept: () => void;
  onBack: () => void;
  loading: boolean;
}

export function ReviewStep({
  formData,
  onAccept,
  onBack,
  loading,
}: ReviewStepProps) {
  const assetMap = useStore((s) => s.rules.assetMaps.assetMap);
  const stats = useStore((s) => s.rules.stats);

  const [portraitUrl, setPortraitUrl] = useState<string | undefined>();

  useEffect(() => {
    if (formData.portrait?.image) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === "string") {
          setPortraitUrl(e.target.result);
        }
      };
      reader.readAsDataURL(formData.portrait.image);
    } else {
      setPortraitUrl(undefined);
    }
  }, [formData.portrait]);

  const pathAssets = formData.assets.slice(0, 2);
  const finalAsset = formData.assets[2];

  const pathNames = pathAssets
    .map((a) => assetMap[a.id]?.name)
    .filter(Boolean)
    .join(", ");

  const finalAssetName = finalAsset ? assetMap[finalAsset.id]?.name : undefined;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Your Character
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Review everything before creating your character. Click Back to make
        changes.
      </Typography>

      <Stack direction="row" spacing={3} mb={3} alignItems="flex-start">
        {portraitUrl && (
          <Box
            component="img"
            src={portraitUrl}
            alt="Character portrait"
            sx={{
              width: 120,
              height: 120,
              objectFit: "cover",
              borderRadius: 1,
              flexShrink: 0,
              border: "1px solid",
              borderColor: "divider",
            }}
          />
        )}
        <Box flex={1}>
          <Typography variant="h5" gutterBottom>
            {formData.name}
            {formData.callsign && (
              <Typography component="span" variant="h6" color="text.secondary" sx={{ ml: 1 }}>
                — &ldquo;{formData.callsign}&rdquo;
              </Typography>
            )}
          </Typography>
          {formData.pronouns && (
            <Typography variant="body2" color="text.secondary">
              {formData.pronouns}
            </Typography>
          )}
          {formData.characteristics && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", mt: 0.5 }}>
              {formData.characteristics}
            </Typography>
          )}
        </Box>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Table size="small" sx={{ mb: 3 }}>
        <TableBody>
          {pathNames && (
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", width: 140 }}>Paths</TableCell>
              <TableCell>{pathNames}</TableCell>
            </TableRow>
          )}
          {finalAssetName && (
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Final Asset</TableCell>
              <TableCell>{finalAssetName}</TableCell>
            </TableRow>
          )}
          {formData.role && (
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Role</TableCell>
              <TableCell>{formData.role}</TableCell>
            </TableRow>
          )}
          {formData.backstory && (
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", verticalAlign: "top" }}>
                Backstory
              </TableCell>
              <TableCell sx={{ whiteSpace: "pre-wrap" }}>
                {formData.backstory}
              </TableCell>
            </TableRow>
          )}
          {formData.backgroundVow && (
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Background Vow</TableCell>
              <TableCell>{formData.backgroundVow}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {Object.keys(formData.stats).length > 0 && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Stats
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {Object.entries(formData.stats).map(([key, value]) => (
              <Paper
                key={key}
                variant="outlined"
                sx={{ px: 1.5, py: 0.5, minWidth: 72, textAlign: "center" }}
              >
                <Typography variant="caption" display="block" color="text.secondary">
                  {stats[key]?.label ?? key}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {value}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {(formData.look || formData.act || formData.wear) && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Appearance
          </Typography>
          <Table size="small">
            <TableBody>
              {formData.look && (
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", width: 60 }}>Look</TableCell>
                  <TableCell>{formData.look}</TableCell>
                </TableRow>
              )}
              {formData.act && (
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Act</TableCell>
                  <TableCell>{formData.act}</TableCell>
                </TableRow>
              )}
              {formData.wear && (
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Wear</TableCell>
                  <TableCell>{formData.wear}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}


      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          disabled={loading}
        >
          Back
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <CheckIcon />}
          onClick={onAccept}
          disabled={loading}
        >
          {loading ? "Creating…" : "Accept — Create Character"}
        </Button>
      </Stack>
    </Box>
  );
}
