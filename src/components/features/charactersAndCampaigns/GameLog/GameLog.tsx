import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "stores/store";
import { Virtuoso } from "react-virtuoso";
import { Box, LinearProgress } from "@mui/material";
import { GameLogEntry } from "./GameLogEntry";
import { useGameLogQuery } from "hooks/queries/useGameLogQuery";

const MAX_ITEMS = 1000000000;
const PAGE_SIZE = 20;

export function GameLog() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const isGM = useStore(
    (store) =>
      store.campaigns.currentCampaign.currentCampaign?.gmIds?.includes(
        store.auth.uid
      ) ?? !campaignId
  );

  const entityType = campaignId ? "campaign" : "character";
  const entityId = campaignId ?? characterId ?? "";

  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data = [], isFetching } = useGameLogQuery({
    entityType,
    entityId: entityId || undefined,
    limit,
    isGM,
  });

  const orderedEntries = useMemo(
    () =>
      [...data].sort(
        (a, b) => a.roll.timestamp.getTime() - b.roll.timestamp.getTime()
      ),
    [data]
  );

  const logLength = orderedEntries.length;
  const hasLogs = logLength > 0;

  const loadMoreLogs = useCallback(() => {
    if (hasLogs) {
      setLimit((l) => l + PAGE_SIZE);
    }
  }, [hasLogs]);

  const [firstItemIndex, setFirstItemIndex] = useState(MAX_ITEMS);

  useEffect(() => {
    setFirstItemIndex(MAX_ITEMS - logLength);
  }, [logLength]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {isFetching && <LinearProgress />}
      <Virtuoso
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={MAX_ITEMS - 1}
        data={orderedEntries}
        startReached={loadMoreLogs}
        itemContent={(index, entry) => (
          <GameLogEntry logId={entry.id} log={entry.roll} />
        )}
      />
    </Box>
  );
}
