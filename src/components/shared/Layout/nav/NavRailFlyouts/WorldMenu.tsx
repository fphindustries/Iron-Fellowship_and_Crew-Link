import { ListItem, ListItemButton, ListItemText } from "@mui/material";
import { LinkComponent } from "components/shared/LinkComponent";
import { constructWorldSheetPath } from "pages/World/routes";
import { useAllWorldsQuery } from "hooks/queries/useWorldsQuery";
import { FlyoutMenuList } from "./FlyoutMenuList";

export function WorldMenu() {
  const { data: worlds } = useAllWorldsQuery();
  return (
    <FlyoutMenuList
      label={"Worlds"}
      itemIds={(worlds ?? []).map((w) => w.id)}
      renderListItem={(worldId) => {
        const world = worlds?.find((w) => w.id === worldId);
        return (
          <ListItem key={worldId} disablePadding>
            <ListItemButton
              LinkComponent={LinkComponent}
              href={constructWorldSheetPath(worldId)}
            >
              <ListItemText primary={world?.name ?? worldId} />
            </ListItemButton>
          </ListItem>
        );
      }}
    />
  );
}
