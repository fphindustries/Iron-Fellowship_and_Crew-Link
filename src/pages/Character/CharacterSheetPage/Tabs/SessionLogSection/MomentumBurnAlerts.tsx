import { Alert, Button } from "@mui/material";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { ROLL_RESULT } from "types/DieRolls.type";
import { getOutcomeLabel } from "./moveUtils";

interface MomentumBurnAlertsProps {
  canBurnMomentum: boolean;
  momentum: number;
  momentumResetValue: number;
  burnOutcome: ROLL_RESULT;
  momentumBurned: number | undefined;
  onBurn: () => void;
}

export function MomentumBurnAlerts({
  canBurnMomentum,
  momentum,
  momentumResetValue,
  burnOutcome,
  momentumBurned,
  onBurn,
}: MomentumBurnAlertsProps) {
  return (
    <>
      {canBurnMomentum && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          icon={<LocalFireDepartmentIcon fontSize="inherit" />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={onBurn}
              startIcon={<LocalFireDepartmentIcon fontSize="inherit" />}
            >
              Burn
            </Button>
          }
        >
          Burn momentum ({momentum}) for a{" "}
          <strong>{getOutcomeLabel(burnOutcome)}</strong>. Momentum resets to{" "}
          {momentumResetValue}.
        </Alert>
      )}
      {momentumBurned !== undefined && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          icon={<LocalFireDepartmentIcon fontSize="inherit" />}
        >
          Momentum burned ({momentumBurned} → resets to {momentumResetValue}).
        </Alert>
      )}
    </>
  );
}
