import { Box, Card, CardActionArea, Typography } from "@mui/material";
import {
  CAMPAIGN_ROUTES,
  constructCampaignSheetPath,
} from "pages/Campaign/routes";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CampaignDocument,
  CampaignType,
} from "types/Campaign.type";
import { useUsersQueries } from "hooks/queries/useUsersQuery";
import OpenIcon from "@mui/icons-material/ChevronRight";
import SoloIcon from "@mui/icons-material/Person4";
import CoopIcon from "@mui/icons-material/Group";
import GuidedIcon from "@mui/icons-material/Groups2";

export interface CampaignCard {
  campaign: CampaignDocument;
  campaignId: string;
}

export function CampaignCard(props: CampaignCard) {
  const { campaign, campaignId } = props;

  const campaignType = campaign.type ?? CampaignType.Guided;

  const gmIds = useMemo(() => campaign.gmIds ?? [], [campaign.gmIds]);
  const playerIds = useMemo(() => campaign.users ?? [], [campaign.users]);

  const allIds = useMemo(
    () => [...new Set([...gmIds, ...playerIds])],
    [gmIds, playerIds]
  );
  const userResults = useUsersQueries(allIds);
  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    allIds.forEach((uid, i) => {
      const name = userResults[i]?.data?.displayName;
      if (name) map[uid] = name;
    });
    return map;
  }, [allIds, userResults]);

  const playerNameString = playerIds
    .map((id) => userMap[id])
    .filter(Boolean)
    .join(", ");

  const gmNameString = gmIds
    .map((id) => userMap[id])
    .filter(Boolean)
    .join(", ");

  return (
    <Card elevation={2} sx={{ height: "100%" }}>
      <CardActionArea
        component={Link}
        to={constructCampaignSheetPath(campaignId, CAMPAIGN_ROUTES.SHEET)}
        sx={{
          p: 2,
          height: "100%",
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        <Box
          flexShrink={0}
          alignSelf={"flex-start"}
          mr={1}
          borderRadius={999}
          color={"primary.contrastText"}
          bgcolor={"primary.main"}
          p={1}
          display={"flex"}
          alignItems={"center"}
          justifyContent={"center"}
        >
          {campaignType === CampaignType.Solo && <SoloIcon />}
          {campaignType === CampaignType.Coop && <CoopIcon />}
          {campaignType === CampaignType.Guided && <GuidedIcon />}
        </Box>
        <Box flexGrow={1} overflow={"hidden"}>
          <Typography variant={"h6"} component={"p"} lineHeight={1.1}>
            {campaign.name}
          </Typography>
          {campaignType === CampaignType.Solo && (
            <Typography
              color={"textSecondary"}
              component={"p"}
              textOverflow={"ellipsis"}
              whiteSpace={"nowrap"}
              overflow={"hidden"}
            >
              Solo Campaign
            </Typography>
          )}
          {campaignType === CampaignType.Coop && (
            <Typography
              color={"textSecondary"}
              component={"p"}
              textOverflow={"ellipsis"}
              whiteSpace={"nowrap"}
              overflow={"hidden"}
            >
              Players: {playerNameString}
            </Typography>
          )}
          {campaignType === CampaignType.Guided && (
            <Typography
              color={"textSecondary"}
              component={"p"}
              textOverflow={"ellipsis"}
              whiteSpace={"nowrap"}
              overflow={"hidden"}
            >
              {(!campaign.gmIds || campaign.gmIds.length === 0) &&
                "No Guide Found"}
              {(gmIds ?? []).length > 1 ? "Guides:" : "Guide: "}
              {gmNameString}
            </Typography>
          )}
        </Box>
        <Box
          display={"flex"}
          alignItems={"center"}
          justifyContent={"flex-end"}
          alignSelf={"stretch"}
          ml={1}
        >
          <OpenIcon aria-hidden />
        </Box>
      </CardActionArea>
    </Card>
  );
}
