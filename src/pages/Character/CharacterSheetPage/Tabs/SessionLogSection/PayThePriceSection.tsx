import { useMemo } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import { useStore } from "stores/store";
import { rollOracle } from "stores/appState/rollers/rollOracle";

const PAY_THE_PRICE_ORACLE_IDS = [
  "starforged/oracles/moves/pay_the_price",
  "classic/oracles/moves/pay_the_price",
];
const STORY_COMPLICATION_ORACLE_IDS = [
  "starforged/oracles/misc/story_complication",
];

interface PayThePriceSectionProps {
  /** Move-specific miss flavor text shown in the error Alert. */
  missText: string;
  oracleResult: { label: string; result: string } | undefined;
  onOracleResult: (result: { label: string; result: string }) => void;
}

export function PayThePriceSection({
  missText,
  oracleResult,
  onOracleResult,
}: PayThePriceSectionProps) {
  const allOraclesMap = useStore((s) => s.rules.oracleMaps.allOraclesMap);
  const characterId = useStore(
    (s) => s.characters.currentCharacter.currentCharacterId ?? null
  );
  const uid = useStore((s) => s.auth.uid);

  const payThePriceOracle = useMemo(
    () => PAY_THE_PRICE_ORACLE_IDS.map((id) => allOraclesMap[id]).find(Boolean),
    [allOraclesMap]
  );
  const storyComplicationOracle = useMemo(
    () =>
      STORY_COMPLICATION_ORACLE_IDS.map((id) => allOraclesMap[id]).find(Boolean),
    [allOraclesMap]
  );

  const handleRollOracle = (
    oracle: NonNullable<typeof payThePriceOracle>,
    label: string
  ) => {
    const result = rollOracle(oracle, characterId, uid, false);
    if (result?.result) onOracleResult({ label, result: result.result });
  };

  return (
    <Box mb={2}>
      <Alert severity="error" sx={{ mb: 1.5 }}>
        {missText}
      </Alert>
      <Box display="flex" gap={1} flexWrap="wrap" mb={1.5}>
        {payThePriceOracle && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<CasinoIcon />}
            onClick={() =>
              handleRollOracle(payThePriceOracle, "Pay the Price")
            }
          >
            Roll Pay the Price
          </Button>
        )}
        {storyComplicationOracle && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<CasinoIcon />}
            onClick={() =>
              handleRollOracle(storyComplicationOracle, "Story Complication")
            }
          >
            Roll Story Complication
          </Button>
        )}
      </Box>
      {oracleResult && (
        <Box
          p={1.5}
          mb={1.5}
          sx={(theme) => ({
            bgcolor: theme.palette.action.hover,
            borderRadius: 1,
          })}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mb={0.25}
          >
            {oracleResult.label}
          </Typography>
          <Typography variant="body2" fontStyle="italic">
            {oracleResult.result}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
