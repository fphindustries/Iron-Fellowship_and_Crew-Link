import { Box, Button, Card, Stack, Typography } from "@mui/material";
import { CampaignType } from "types/Campaign.type";
import { UserAvatar } from "components/shared/UserAvatar";
import { useCampaignType } from "hooks/useCampaignType";
import { useStore } from "stores/store";
import { useUserQuery } from "hooks/queries/useUsersQuery";
import {
  useLeaveCampaignMutation,
  useUpdateCampaignGMMutation,
} from "hooks/queries/useCampaignsQuery";
import { ignoreApiError } from "config/api.config";

export interface UserCardProps {
  uid: string;
}

export function UserCard(props: UserCardProps) {
  const { uid } = props;

  const currentUid = useStore((store) => store.auth.uid);

  const { data: user } = useUserQuery(uid);
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const worldId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.worldId
  );
  const gmIds = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.gmIds ?? []
  );
  const characterIds = useStore(
    (store) =>
      store.campaigns.currentCampaign.currentCampaign?.characters
        .filter((character) => character.uid === uid)
        .map((character) => character.characterId) ?? []
  );

  const { campaignType, showGuidedPlayerView } = useCampaignType();

  const updateGuide = useUpdateCampaignGMMutation(campaignId);
  const removeUser = useLeaveCampaignMutation(campaignId);

  return (
    <Card variant={"outlined"} sx={{ height: "100%" }}>
      <Box display={"flex"} alignItems={"center"} p={2}>
        <UserAvatar uid={uid} />
        <Box ml={1}>
          <Typography variant={"h6"} lineHeight={1}>
            {user?.displayName}
          </Typography>
          {campaignType === CampaignType.Guided && gmIds.includes(uid) && (
            <Typography color={"textSecondary"}>Guide</Typography>
          )}
        </Box>
      </Box>
      {campaignType === CampaignType.Guided &&
        uid !== currentUid &&
        !gmIds.includes(uid) &&
        !showGuidedPlayerView && (
          <Stack direction={"row"} spacing={1} justifyContent={"flex-end"}>
            <Button
              color={"error"}
              onClick={() =>
                removeUser
                  .mutateAsync({ userId: uid, gmIds, characterIds })
                  .catch(ignoreApiError)
              }
            >
              Remove
            </Button>
            <Button
              color={"inherit"}
              onClick={() =>
                updateGuide
                  .mutateAsync({ userId: uid, worldId })
                  .catch(ignoreApiError)
              }
            >
              Make Guide
            </Button>
          </Stack>
        )}
    </Card>
  );
}
