import {
  ListItem,
  ListItemAvatar,
  ListItemText,
  Skeleton,
} from "@mui/material";
import { UserAvatar } from "components/shared/UserAvatar";
import { useUserQuery } from "hooks/queries/useUsersQuery";

export interface UserListItemProps {
  uid: string;
}

export function UserListItem(props: UserListItemProps) {
  const { uid } = props;

  const { data: user } = useUserQuery(uid);

  return (
    <ListItem>
      <ListItemAvatar>
        <UserAvatar uid={uid} />
      </ListItemAvatar>
      <ListItemText>{user?.displayName ?? <Skeleton />}</ListItemText>
    </ListItem>
  );
}
