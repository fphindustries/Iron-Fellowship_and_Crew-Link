import { Box, Card, CardActionArea, Skeleton, Typography } from "@mui/material";
import { constructWorldSheetPath } from "pages/World/routes";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useWorldQuery } from "hooks/queries/useWorldsQuery";
import { useUsersQueries } from "hooks/queries/useUsersQuery";
import OpenIcon from "@mui/icons-material/ChevronRight";

export interface WorldCardProps {
  worldId: string;
}

export function WorldCard(props: WorldCardProps) {
  const { worldId } = props;

  const { data: world } = useWorldQuery(worldId);
  const ownerIds = useMemo(() => world?.ownerIds ?? [], [world?.ownerIds]);
  const ownerResults = useUsersQueries(ownerIds);

  const worldOwnerString = useMemo(
    () =>
      ownerIds
        .map((_, i) => ownerResults[i]?.data?.displayName)
        .filter(Boolean)
        .join(", "),
    [ownerIds, ownerResults]
  );

  return (
    <Card elevation={2} sx={{ height: "100%" }}>
      <CardActionArea
        component={Link}
        to={constructWorldSheetPath(worldId)}
        sx={{ p: 2, height: "100%", display: "flex", alignItems: "flex-start" }}
      >
        <Box flexGrow={1}>
          <Typography variant={"h6"} component={"p"}>
            {world?.name ?? <Skeleton width={"16ch"} />}
          </Typography>
          <Typography color={"textSecondary"}>
            Editors:{" "}
            {worldOwnerString ? worldOwnerString : <Skeleton width={"12ch"} />}
          </Typography>
        </Box>
        <Box
          display={"flex"}
          alignItems={"center"}
          justifyContent={"flex-end"}
          alignSelf={"stretch"}
        >
          <OpenIcon aria-hidden />
        </Box>
      </CardActionArea>
    </Card>
  );
}
