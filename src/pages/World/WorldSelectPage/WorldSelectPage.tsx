import { Alert, Box, Button, Hidden, LinearProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "components/shared/EmptyState/EmptyState";
import AddWorldIcon from "@mui/icons-material/Add";
import { constructWorldSheetPath } from "../routes";
import { PageContent, PageHeader } from "components/shared/Layout";
import { WorldCard } from "./components/WorldCard";
import { Head } from "providers/HeadProvider/Head";
import { useStore } from "stores/store";
import { FooterFab } from "components/shared/Layout/FooterFab";
import { ignoreApiError } from "config/api.config";
import { useAllWorldsQuery, useCreateWorldMutation } from "hooks/queries/useWorldsQuery";

export function WorldSelectPage() {
  const uid = useStore((store) => store.auth.uid);
  const { data: worlds, isLoading, error } = useAllWorldsQuery();

  const sortedWorldIds = (worlds ?? [])
    .slice()
    .sort((a, b) => {
      const isOwnerA = a.ownerIds.includes(uid);
      const isOwnerB = b.ownerIds.includes(uid);
      if (isOwnerA && !isOwnerB) return -1;
      if (!isOwnerA && isOwnerB) return 1;
      return a.name.localeCompare(b.name);
    })
    .map((w) => w.id);

  const navigate = useNavigate();
  const createMutation = useCreateWorldMutation();

  const handleWorldCreate = () => {
    createMutation
      .mutateAsync()
      .then((row) => {
        navigate(constructWorldSheetPath(row.id));
      })
      .catch(ignoreApiError);
  };

  if (isLoading) {
    return (
      <LinearProgress
        sx={{
          width: "100vw",
          position: "absolute",
          left: 0,
          marginTop: -3,
        }}
      />
    );
  }

  return (
    <>
      <Head
        title={"Your Worlds"}
        description="A list of all of your worlds or worlds in campaigns you've joined."
      />
      <PageHeader
        label={"Your Worlds"}
        actions={
          <Hidden smDown>
            <Button
              variant={"contained"}
              color={"primary"}
              endIcon={<AddWorldIcon aria-hidden />}
              onClick={() => handleWorldCreate()}
            >
              Create a World
            </Button>
          </Hidden>
        }
      />
      <PageContent isPaper={!sortedWorldIds || sortedWorldIds.length === 0}>
        {error && <Alert severity="error">Error loading your worlds.</Alert>}
        {!sortedWorldIds || sortedWorldIds.length === 0 ? (
          <EmptyState
            showImage
            title={"No Worlds Found"}
            message={
              "Worlds allow you to share location notes and truths across multiple characters or campaigns."
            }
            callToAction={
              <Button
                onClick={handleWorldCreate}
                variant={"contained"}
                endIcon={<AddWorldIcon />}
              >
                Create a World
              </Button>
            }
          />
        ) : (
          <Box
            component={"ul"}
            display={"grid"}
            gridTemplateColumns={"repeat(12, 1fr)"}
            gap={2}
            pl={0}
            my={0}
            sx={{ listStyle: "none" }}
          >
            {sortedWorldIds.map((worldId) => (
              <Box
                component={"li"}
                gridColumn={{
                  xs: "span 12",
                  sm: "span 6",
                  md: "span 4",
                }}
                key={worldId}
              >
                <WorldCard worldId={worldId} />
              </Box>
            ))}
          </Box>
        )}
        <Hidden smUp>
          <Box height={80} />
        </Hidden>
        <Hidden smUp>
          <FooterFab color={"primary"} onClick={() => handleWorldCreate()}>
            <AddWorldIcon aria-label={"Create a World"} />
          </FooterFab>
        </Hidden>
      </PageContent>
    </>
  );
}
