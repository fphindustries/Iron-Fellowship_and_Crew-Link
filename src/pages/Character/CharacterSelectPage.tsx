import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Hidden,
  LinearProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import { CharacterList } from "../../components/features/characters/CharacterList";
import { EmptyState } from "../../components/shared/EmptyState/EmptyState";
import AddCharacterIcon from "@mui/icons-material/PersonAdd";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import {
  CHARACTER_ROUTES,
  constructCharacterPath,
  constructCharacterGuidedCreatePath,
} from "./routes";
import { PageHeader } from "components/shared/Layout/PageHeader";
import { PageContent } from "components/shared/Layout";
import { Head } from "providers/HeadProvider/Head";
import { useStore } from "stores/store";
import { useAppName } from "hooks/useAppName";
import { FooterFab } from "components/shared/Layout/FooterFab";
import { LinkComponent } from "components/shared/LinkComponent";
import { useGameSystemValue } from "hooks/useGameSystemValue";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { useMemo } from "react";
import { useCharactersQuery } from "hooks/queries/useCharactersQuery";
import { toCharacterDocument } from "stores/character/character.slice";
import { getErrorMessage } from "functions/getErrorMessage";

export function Component() {
  const uid = useStore((store) => store.auth.user?.id);
  const { data: characterRows = [], isLoading, error } = useCharactersQuery(uid);
  const appName = useAppName();
  const showGuidedCreate = useGameSystemValue({
    [GAME_SYSTEMS.IRONSWORN]: false,
    [GAME_SYSTEMS.STARFORGED]: true,
  });
  const characters = useMemo(
    () =>
      Object.fromEntries(
        characterRows.map((row) => [row.id, toCharacterDocument(row)])
      ),
    [characterRows]
  );
  const errorMessage = error
    ? getErrorMessage(error, "Failed to load your characters.")
    : undefined;

  if (isLoading) {
    return <LinearProgress color={"primary"} />;
  }

  return (
    <>
      <Head
        title={"Your Characters"}
        description={`A list of your characters in ${appName}`}
      />
      <PageHeader
        label={"Your Characters"}
        actions={
          <Hidden smDown>
            <Box display="flex" gap={1}>
              {showGuidedCreate && (
                <Button
                  component={Link}
                  to={constructCharacterGuidedCreatePath()}
                  variant={"outlined"}
                  color={"primary"}
                  endIcon={<MenuBookIcon aria-hidden />}
                >
                  Guided Creation
                </Button>
              )}
              <Button
                component={Link}
                to={constructCharacterPath(CHARACTER_ROUTES.CREATE)}
                variant={"contained"}
                color={"primary"}
                endIcon={<AddCharacterIcon aria-hidden />}
              >
                Create a Character
              </Button>
            </Box>
          </Hidden>
        }
      />
      <PageContent
        isPaper={!characters || Object.keys(characters).length === 0}
      >
        {errorMessage && (
          <Alert severity={"error"} sx={{ mb: 4 }}>
            <AlertTitle>Error Loading Characters</AlertTitle>
            {errorMessage}
          </Alert>
        )}
        {!characters || Object.keys(characters).length === 0 ? (
          <EmptyState
            showImage
            title={"No Characters Found"}
            message={"Get started on your journey by creating a new character."}
            callToAction={
              <Button
                component={Link}
                to={constructCharacterPath(CHARACTER_ROUTES.CREATE)}
                variant={"contained"}
                endIcon={<AddCharacterIcon />}
              >
                Create a Character
              </Button>
            }
          />
        ) : (
          <>
            <CharacterList
              characters={characters}
              linkToCharacterSheet
              raised
            />
            <Hidden smUp>
              <Box height={80} />
            </Hidden>
            <Hidden smUp>
              <FooterFab
                LinkComponent={LinkComponent}
                href={constructCharacterPath(CHARACTER_ROUTES.CREATE)}
                color={"primary"}
              >
                <AddCharacterIcon aria-label={"Create a Character"} />
              </FooterFab>
            </Hidden>
          </>
        )}
      </PageContent>
    </>
  );
}
