import { useState } from "react";
import {
  Box,
  Drawer,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { StyledTabs } from "components/shared/StyledTabs";
import { StyledTab } from "components/shared/StyledTabs";
import { TimelineView } from "./TimelineView";
import { RecapView } from "./RecapView";
import { CanonLedgerView } from "./CanonLedgerView";

interface SessionHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SessionHistoryDrawer({ open, onClose }: SessionHistoryDrawerProps) {
  const [tab, setTab] = useState(0);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 420, maxWidth: "100vw", display: "flex", flexDirection: "column" },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1.5,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        <Typography variant="h6" sx={{ flex: 1 }}>
          Session History
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}`, flexShrink: 0 }}>
        <StyledTabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
        >
          <StyledTab label="Timeline" />
          <StyledTab label="Recap" />
          <StyledTab label="Canon" />
        </StyledTabs>
      </Box>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {tab === 0 && <TimelineView />}
        {tab === 1 && <RecapView />}
        {tab === 2 && <CanonLedgerView />}
      </Box>
    </Drawer>
  );
}
