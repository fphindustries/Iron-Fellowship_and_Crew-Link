import { Box, Card, ButtonBase, Chip, Divider, Stack, Typography } from "@mui/material";
import { useStore } from "stores/store";
import { KnowledgeBadge } from "../shared/KnowledgeBadge";
import { useCockpit } from "../shared/CockpitContext";
import { SpotlightIndicator } from "../shared/SpotlightIndicator";

export function CockpitLeftRail() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const characterMap = useStore(
    (store) => store.campaigns.currentCampaign.characters.characterMap
  );
  const npcIntents = useStore(
    (store) => store.aiGuide.state?.npcIntents ?? {}
  );

  const characters = Object.entries(characterMap);
  const npcEntries = Object.entries(npcIntents);
  const characterNames = characters.map(([, char]) => char.name);

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "auto",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ px: 0.5 }}>
        Party &amp; NPCs
      </Typography>

      {characters.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mb={0.5}
            sx={{ px: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            Characters
          </Typography>
          {campaignId && (
            <Box mb={1}>
              <SpotlightIndicator
                campaignId={campaignId}
                characterNames={characterNames}
              />
            </Box>
          )}
          <Stack spacing={0.75}>
            {characters.map(([charId, char]) => (
              <CharacterRow key={charId} characterId={charId} character={char} />
            ))}
          </Stack>
        </Box>
      )}

      {npcEntries.length > 0 && (
        <>
          {characters.length > 0 && <Divider />}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
              sx={{ px: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              NPCs in Scene
            </Typography>
            <Stack spacing={0.75}>
              {npcEntries.map(([name, intent]) => (
                <NPCRow key={name} name={name} intent={intent} />
              ))}
            </Stack>
          </Box>
        </>
      )}

      {characters.length === 0 && npcEntries.length === 0 && (
        <Typography variant="body2" color="text.disabled" sx={{ px: 0.5 }}>
          No party members yet.
        </Typography>
      )}
    </Box>
  );
}

interface CharacterRowProps {
  characterId: string;
  character: {
    name: string;
    momentum: number;
    conditionMeters?: Record<string, number>;
    stats?: Record<string, number>;
  };
}

function CharacterRow({ characterId, character }: CharacterRowProps) {
  const { openEntity } = useCockpit();
  const health = character.conditionMeters?.health;
  const spirit = character.conditionMeters?.spirit;

  return (
    <Card
      variant="outlined"
      component={ButtonBase}
      onClick={() => openEntity({ type: "character", characterId })}
      sx={{
        p: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0.5,
        width: "100%",
        textAlign: "left",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
        {character.name}
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={0.5}>
        <Chip
          label={`Momentum ${character.momentum}`}
          size="small"
          variant="outlined"
          color={character.momentum < 0 ? "error" : "default"}
          sx={{ fontSize: 10, height: 18 }}
        />
        {health !== undefined && (
          <Chip
            label={`Health ${health}`}
            size="small"
            variant="outlined"
            color={health <= 2 ? "error" : health <= 4 ? "warning" : "default"}
            sx={{ fontSize: 10, height: 18 }}
          />
        )}
        {spirit !== undefined && (
          <Chip
            label={`Spirit ${spirit}`}
            size="small"
            variant="outlined"
            color={spirit <= 2 ? "error" : "default"}
            sx={{ fontSize: 10, height: 18 }}
          />
        )}
      </Box>
    </Card>
  );
}

interface NPCRowProps {
  name: string;
  intent: {
    currentIntent: string;
    firstImpressionRevealed: boolean;
    hiddenAspects: string[];
  };
}

function NPCRow({ name, intent }: NPCRowProps) {
  const { openEntity } = useCockpit();
  const knowledge =
    !intent.firstImpressionRevealed
      ? "hidden"
      : intent.hiddenAspects.length > 0
      ? "suspected"
      : "known";

  return (
    <Card
      variant="outlined"
      component={ButtonBase}
      onClick={() => openEntity({ type: "npc", name })}
      sx={{
        p: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0.5,
        width: "100%",
        textAlign: "left",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Box display="flex" alignItems="center" gap={0.75} width="100%">
        <Typography variant="subtitle2" sx={{ flex: 1, lineHeight: 1.2 }}>
          {name}
        </Typography>
        <KnowledgeBadge knowledge={knowledge} />
      </Box>
      {intent.firstImpressionRevealed && intent.currentIntent && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.3 }}
        >
          {intent.currentIntent}
        </Typography>
      )}
    </Card>
  );
}
