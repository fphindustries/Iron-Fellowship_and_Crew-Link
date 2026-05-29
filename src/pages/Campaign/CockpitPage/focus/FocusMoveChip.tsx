import { useState } from "react";
import { Box, Chip, Tooltip, Typography } from "@mui/material";
import { useStore } from "stores/store";
import { GuidedMoveModal } from "../moves/GuidedMoveModal";

interface FocusMoveChipProps {
  moveId: string;
  intent?: string;
  color?: "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success";
}

export function FocusMoveChip({ moveId, intent, color = "default" }: FocusMoveChipProps) {
  const move = useStore((store) => store.rules.moveMaps.moveMap[moveId]);
  const [modalOpen, setModalOpen] = useState(false);

  if (!move) return null;

  return (
    <>
      <Tooltip title={intent ?? `Roll ${move.name}`} placement="top">
        <Chip
          label={move.name}
          color={color}
          clickable
          onClick={() => setModalOpen(true)}
          sx={{ fontWeight: 500 }}
        />
      </Tooltip>
      <GuidedMoveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        intent={intent ?? move.name}
        moveName={move.name}
      />
    </>
  );
}

interface FocusMoveGroupProps {
  label: string;
  children: React.ReactNode;
}

export function FocusMoveGroup({ label, children }: FocusMoveGroupProps) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        mb={0.75}
        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={0.75}>
        {children}
      </Box>
    </Box>
  );
}
