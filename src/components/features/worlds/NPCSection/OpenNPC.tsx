import {
  Alert,
  Autocomplete,
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
} from "@mui/material";
import { NPC, DefaultNPCSpecies } from "types/NPCs.type";
import { DebouncedOracleInput } from "components/shared/DebouncedOracleInput";
import DeleteIcon from "@mui/icons-material/Delete";
import { useConfirm } from "material-ui-confirm";
import { RtcRichTextEditor } from "components/shared/RichTextEditor/RtcRichTextEditor";
import { NPCDocumentWithGMProperties } from "stores/world/currentWorld/npcs/npcs.slice.type";
import { LocationWithGMProperties } from "stores/world/currentWorld/locations/locations.slice.type";
import { useListenToCurrentNPC } from "stores/world/currentWorld/npcs/useListenToCurrentNPC";
import { useStore } from "stores/store";
import { BondsSection } from "components/features/worlds/BondsSection";
import { useWorldPermissions } from "../useWorldPermissions";
import { useGameSystemValue } from "hooks/useGameSystemValue";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { Sector } from "types/Sector.type";
import { Difficulty } from "types/Track.type";
import { GuideAndPlayerHeader, GuideOnlyHeader } from "../common";
import { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from "lib/storage.lib";
import { useSnackbar } from "providers/SnackbarProvider";
import { mergeIcons } from "components/shared/GameIcons/mergeIcons";
import { IconColors } from "types/Icon.type";
import { PageWithImage } from "../common/PageWithImage";
import { useNewMaps } from "hooks/featureFlags/useNewMaps";
import { ignoreApiError } from "config/api.config";
import { AiTriggerButton } from "components/shared/AiTriggerButton";
import {
  useDeleteNPCMutation,
  useUpdateNPCMutation,
  useUpdateNPCNotesMutation,
} from "hooks/queries/useWorldEntitiesQuery";
import { fileToBase64 } from "lib/storage.lib";

const defaultNPCSpeciesOptions: {
  enum: DefaultNPCSpecies;
  label: string;
}[] = [
  {
    enum: DefaultNPCSpecies.Ironlander,
    label: "Ironlander",
  },
  {
    enum: DefaultNPCSpecies.Elf,
    label: "Elf",
  },
  {
    enum: DefaultNPCSpecies.Giant,
    label: "Giant",
  },
  {
    enum: DefaultNPCSpecies.Varou,
    label: "Varou",
  },
  {
    enum: DefaultNPCSpecies.Troll,
    label: "Troll",
  },
  {
    enum: DefaultNPCSpecies.Other,
    label: "Other",
  },
];

const getSpeciesEnumFromLabel = (
  label: string | undefined | null
): DefaultNPCSpecies | string | null => {
  if (!label) {
    return null;
  }
  const matchingOption = defaultNPCSpeciesOptions.find(
    (option) => option.label === label
  );
  return matchingOption?.enum ?? label;
};

const getSpeciesLabelFromEnum = (
  enumValue: DefaultNPCSpecies | string | null | undefined
): string | null => {
  if (!enumValue) {
    return null;
  }
  const matchingOption = defaultNPCSpeciesOptions.find(
    (option) => option.enum === enumValue
  );
  return matchingOption?.label ?? enumValue;
};

export interface OpenNPCProps {
  worldId: string;
  npcId: string;
  locations: { [key: string]: LocationWithGMProperties };
  sectors: Record<string, Sector>;
  npc: NPCDocumentWithGMProperties;
  closeNPC: () => void;
  hideBorder?: boolean;
}

const nameOracles: { [key in DefaultNPCSpecies]: string | string[] } = {
  [DefaultNPCSpecies.Ironlander]: [
    "classic/oracles/name/ironlander/a",
    "classic/oracles/name/ironlander/b",
  ],
  [DefaultNPCSpecies.Elf]: "classic/oracles/name/elf",
  [DefaultNPCSpecies.Giant]: "classic/oracles/name/other/giants",
  [DefaultNPCSpecies.Varou]: "classic/oracles/name/other/varou",
  [DefaultNPCSpecies.Troll]: "classic/oracles/name/other/trolls",
  [DefaultNPCSpecies.Other]: [
    "classic/oracles/name/ironlander/a",
    "classic/oracles/name/ironlander/b",
  ],
};

export function OpenNPC(props: OpenNPCProps) {
  const { worldId, npcId, locations, npc, closeNPC, sectors, hideBorder } =
    props;
  const confirm = useConfirm();

  const { showGMFields, showGMTips, isGuidedGame } = useWorldPermissions();

  const usingNewLocations = useNewMaps();
  useListenToCurrentNPC(npcId);

  const updateNPC = useUpdateNPCMutation(worldId);
  const updateNPCNotes = useUpdateNPCNotesMutation(worldId);
  const deleteNPC = useDeleteNPCMutation(worldId);

  const buildNPCPatch = (partialNPC: Partial<NPCDocumentWithGMProperties>) => {
    const {
      name: _existingName,
      imageFilenames: _existingImageFilenames,
      gmProperties: _existingGMProperties,
      notes: _existingNotes,
      imageUrl: _existingImageUrl,
      updatedDate: _existingUpdatedDate,
      createdDate: _existingCreatedDate,
      ...existingData
    } = npc as Partial<NPCDocumentWithGMProperties> & {
      imageFilenames?: string[];
    };
    const {
      name,
      imageFilenames,
      gmProperties: _gmProperties,
      notes: _notes,
      imageUrl: _imageUrl,
      updatedDate: _updatedDate,
      createdDate: _createdDate,
      ...nextData
    } = partialNPC as Partial<NPCDocumentWithGMProperties> & {
      imageFilenames?: string[];
    };

    const patch: Record<string, unknown> = {
      dataJson: { ...existingData, ...nextData },
    };
    if (name !== undefined) patch.name = name;
    if (imageFilenames !== undefined) patch.imageFilenames = imageFilenames;
    return patch;
  };

  const updateNPCDocument = (doc: Partial<NPCDocumentWithGMProperties>) =>
    updateNPC.mutateAsync({ npcId, patch: buildNPCPatch(doc) });

  const updateNPCGMProperties = (
    gmProperties: Partial<NonNullable<NPCDocumentWithGMProperties["gmProperties"]>>
  ) =>
    updateNPCNotes.mutateAsync({
      npcId,
      gmProperties: { ...(npc.gmProperties ?? {}), ...gmProperties },
    });

  const handleUpdateNPC = (doc: Partial<NPC>) => {
    updateNPCDocument(doc).catch(ignoreApiError);
  };

  const handleNPCDelete = () => {
    confirm({
      title: `Delete ${npc.name}`,
      description:
        "Are you sure you want to delete this NPC? It will be deleted from ALL of your characters and campaigns that use this world. This cannot be undone.",
      confirmationText: "Delete",
      confirmationButtonProps: {
        variant: "contained",
        color: "error",
      },
    })
      .then(() => {
        deleteNPC
          .mutateAsync(npcId)
          .catch(ignoreApiError)
          .then(() => {
            closeNPC();
          });
      })
      .catch(ignoreApiError);
  };

  const currentCharacterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const npcLocation = npc.lastLocationId
    ? locations[npc.lastLocationId]
    : undefined;
  const npcLocationBonds = npcLocation?.characterBonds ?? {};
  const npcBonds = npc.characterBonds ?? {};

  const isCharacterBondedToLocation =
    npcLocationBonds[currentCharacterId ?? ""] ?? false;
  const isCharacterBondedToNPC = npcBonds[currentCharacterId ?? ""] ?? false;

  const singleplayerBond = isCharacterBondedToNPC || false;

  const updateNPCCharacterBond = (characterId: string, bonded: boolean) =>
    updateNPCDocument({
      characterBonds: { ...(npc.characterBonds ?? {}), [characterId]: bonded },
    });
  const updateNPCCharacterBondValue = (characterId: string, value: number) =>
    updateNPCDocument({
      characterBondProgress: {
        ...(npc.characterBondProgress ?? {}),
        [characterId]: value,
      },
    });
  const updateNPCCharacterConnection = (
    characterId: string,
    connected: boolean
  ) =>
    updateNPCDocument({
      characterConnections: {
        ...(npc.characterConnections ?? {}),
        [characterId]: connected,
      },
    });

  const isStarforged = useGameSystemValue({
    [GAME_SYSTEMS.IRONSWORN]: false,
    [GAME_SYSTEMS.STARFORGED]: true,
  });

  const npcNameOracles = useGameSystemValue<string | string[]>({
    [GAME_SYSTEMS.IRONSWORN]:
      npc.species && npc.species in nameOracles
        ? nameOracles[npc.species as DefaultNPCSpecies]
        : nameOracles[DefaultNPCSpecies.Ironlander],
    [GAME_SYSTEMS.STARFORGED]: [
      "starforged/oracles/characters/name/given",
      "starforged/oracles/characters/name/family_name",
    ],
  });
  const npcRoleOracle = useGameSystemValue<string>({
    [GAME_SYSTEMS.IRONSWORN]: "classic/oracles/character/role",
    [GAME_SYSTEMS.STARFORGED]: "starforged/oracles/characters/role",
  });
  const npcDispositionOracle = useGameSystemValue<string>({
    [GAME_SYSTEMS.IRONSWORN]: "delve/oracles/character/disposition",
    [GAME_SYSTEMS.STARFORGED]:
      "starforged/oracles/characters/initial_disposition",
  });
  const npcGoalOracle = useGameSystemValue<string>({
    [GAME_SYSTEMS.IRONSWORN]: "classic/oracles/character/goal",
    [GAME_SYSTEMS.STARFORGED]: "starforged/oracles/characters/goal",
  });

  const { error } = useSnackbar();

  const onFileUpload = (file: File) => {
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        error(
          `File is too large. The max file size is ${MAX_FILE_SIZE_LABEL}.`
        );
        return;
      }
      fileToBase64(file)
        .then((imageUrl) =>
          updateNPCDocument({ imageFilenames: [imageUrl] }).catch(
            ignoreApiError
          )
        )
        .catch(ignoreApiError);
    }
  };

  const icon = mergeIcons(
    { key: "GiPerson", color: IconColors.White },
    undefined,
    npc.icon
  );

  return (
    <PageWithImage
      name={npc.name}
      imageUrl={npc.imageUrl}
      icon={icon}
      actions={
        <>
          <AiTriggerButton
            mode="actionElaborator"
            prefill={
              npc.gmProperties?.role
                ? `${npc.name} (${npc.gmProperties.role})`
                : npc.name
            }
            tooltip="Elaborate action with AI Guide"
          />
          {showGMFields && (
            <Tooltip title={"Delete"}>
              <IconButton onClick={() => handleNPCDelete()}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </>
      }
      nameInput={
        <DebouncedOracleInput
          label={"Name"}
          variant={"outlined"}
          color={"primary"}
          oracleTableId={npcNameOracles}
          joinOracleTables={isStarforged}
          initialValue={npc.name}
          updateValue={(newName) =>
            updateNPCDocument({ name: newName })
              .then(() => undefined)
              .catch(ignoreApiError)
          }
          fullWidth={true}
          sx={{
            mt: 1,
          }}
        />
      }
      handleImageUpload={onFileUpload}
      handleIconSelection={(icon) => {
        if (npc.imageUrl) {
          updateNPCDocument({ imageFilenames: [] }).catch(ignoreApiError);
        }
        updateNPCDocument({ icon }).catch(ignoreApiError);
      }}
      handleImageRemove={() =>
        updateNPCDocument({ imageFilenames: [] })
          .then(() => undefined)
          .catch(ignoreApiError)
      }
      handlePageClose={closeNPC}
      hideBorder={hideBorder}
    >
      <Box display={"flex"} flexDirection={"column"}>
        <Box mt={1}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <DebouncedOracleInput
                oracleTableId={undefined}
                label={"Pronouns"}
                initialValue={npc.pronouns ?? ""}
                updateValue={(value) => handleUpdateNPC({ pronouns: value })}
              />
            </Grid>
            {isStarforged && (
              <Grid item xs={12} sm={6}>
                <DebouncedOracleInput
                  oracleTableId={"starforged/oracles/characters/name/callsign"}
                  label={"Callsign"}
                  initialValue={npc.callsign ?? ""}
                  updateValue={(value) => handleUpdateNPC({ callsign: value })}
                />
              </Grid>
            )}
            {isStarforged && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label={"Difficulty"}
                  value={npc.rank ?? "-1"}
                  onChange={(evt) =>
                    handleUpdateNPC({ rank: evt.target.value as Difficulty })
                  }
                  multiline
                  required
                  select
                  fullWidth
                >
                  <MenuItem value={"-1"} disabled></MenuItem>

                  <MenuItem value={Difficulty.Troublesome}>
                    Troublesome
                  </MenuItem>
                  <MenuItem value={Difficulty.Dangerous}>Dangerous</MenuItem>
                  <MenuItem value={Difficulty.Formidable}>Formidable</MenuItem>
                  <MenuItem value={Difficulty.Extreme}>Extreme</MenuItem>
                  <MenuItem value={Difficulty.Epic}>Epic</MenuItem>
                </TextField>
              </Grid>
            )}
            {!isStarforged && (
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  autoSelect
                  options={defaultNPCSpeciesOptions.map(
                    (option) => option.label
                  )}
                  value={getSpeciesLabelFromEnum(npc.species)}
                  onChange={(evt, value) =>
                    handleUpdateNPC({
                      species: getSpeciesEnumFromLabel(value),
                    })
                  }
                  renderInput={(params) => (
                    <TextField {...params} label={"Species"} fullWidth />
                  )}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              {!isStarforged || usingNewLocations ? (
                <Autocomplete
                  options={Object.keys(locations)}
                  getOptionLabel={(locationId) =>
                    locations[locationId]?.name ?? ""
                  }
                  autoHighlight
                  value={npc.lastLocationId ?? null}
                  onChange={(evt, value) =>
                    handleUpdateNPC({ lastLocationId: value ?? "" })
                  }
                  renderInput={(props) => (
                    <TextField {...props} label={"Location"} fullWidth />
                  )}
                />
              ) : (
                <Autocomplete
                  options={Object.keys(sectors)}
                  getOptionLabel={(sectorId) => sectors[sectorId]?.name ?? ""}
                  autoHighlight
                  value={npc.lastSectorId ?? null}
                  onChange={(evt, value) =>
                    handleUpdateNPC({ lastSectorId: value ?? "" })
                  }
                  renderInput={(props) => (
                    <TextField {...props} label={"Sector"} fullWidth />
                  )}
                />
              )}
            </Grid>
            {showGMFields && (
              <>
                {showGMTips && (
                  <Grid item xs={12}>
                    <GuideOnlyHeader breakContainer />
                  </Grid>
                )}
                {!isStarforged && (
                  <Grid item xs={12} sm={6}>
                    <DebouncedOracleInput
                      label={"Descriptor"}
                      initialValue={npc?.gmProperties?.descriptor ?? ""}
                      updateValue={(descriptor) =>
                        updateNPCGMProperties({ descriptor }).catch(() => {})
                      }
                      oracleTableId="classic/oracles/character/descriptor"
                    />
                  </Grid>
                )}
                {isStarforged && (
                  <Grid item xs={12} sm={6}>
                    <DebouncedOracleInput
                      label={"First Look"}
                      initialValue={npc?.gmProperties?.firstLook ?? ""}
                      updateValue={(firstLook) =>
                        updateNPCGMProperties({ firstLook }).catch(() => {})
                      }
                      oracleTableId="starforged/oracles/characters/first_look"
                    />
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <DebouncedOracleInput
                    label={"Role"}
                    initialValue={npc?.gmProperties?.role ?? ""}
                    updateValue={(role) =>
                      updateNPCGMProperties({ role }).catch(ignoreApiError)
                    }
                    oracleTableId={npcRoleOracle}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DebouncedOracleInput
                    label={"Disposition"}
                    initialValue={npc?.gmProperties?.disposition ?? ""}
                    updateValue={(disposition) =>
                      updateNPCGMProperties({ disposition }).catch(() => {})
                    }
                    oracleTableId={npcDispositionOracle}
                  />
                </Grid>
                {!isStarforged && (
                  <Grid item xs={12} sm={6}>
                    <DebouncedOracleInput
                      label={"Activity"}
                      initialValue={npc?.gmProperties?.activity ?? ""}
                      updateValue={(activity) =>
                        updateNPCGMProperties({ activity }).catch(() => {})
                      }
                      oracleTableId="delve/oracles/character/activity"
                    />
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <DebouncedOracleInput
                    label={"Goal"}
                    initialValue={npc?.gmProperties?.goal ?? ""}
                    updateValue={(goal) =>
                      updateNPCGMProperties({ goal }).catch(ignoreApiError)
                    }
                    oracleTableId={npcGoalOracle}
                  />
                </Grid>
                {isStarforged && (
                  <Grid item xs={12} sm={6}>
                    <DebouncedOracleInput
                      label={"Revealed Aspect"}
                      initialValue={npc?.gmProperties?.revealedAspect ?? ""}
                      updateValue={(revealedAspect) =>
                        updateNPCGMProperties({
                          revealedAspect,
                        }).catch(ignoreApiError)
                      }
                      oracleTableId={
                        "starforged/oracles/characters/revealed_aspect"
                      }
                    />
                  </Grid>
                )}
                {showGMFields && isGuidedGame && (
                  <Grid
                    item
                    xs={12}
                    md={6}
                    sx={{ alignItems: "center", display: "flex" }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={npc.sharedWithPlayers ?? false}
                          onChange={(evt, value) =>
                            updateNPCDocument({
                              sharedWithPlayers: value,
                            }).catch(ignoreApiError)
                          }
                        />
                      }
                      label="Visible to Players"
                    />
                  </Grid>
                )}
                {!isGuidedGame && (
                  <BondsSection
                    npc={npc}
                    location={npcLocation}
                    isStarforged={isStarforged}
                    onBondToggle={
                      currentCharacterId
                        ? (bonded) =>
                            updateNPCCharacterBond(
                              currentCharacterId,
                              bonded
                            ).catch(ignoreApiError)
                        : undefined
                    }
                    isBonded={singleplayerBond}
                    bondProgress={
                      npc.characterBondProgress?.[currentCharacterId ?? ""] ?? 0
                    }
                    difficulty={npc.rank}
                    updateBondProgressValue={
                      currentCharacterId
                        ? (value) =>
                            updateNPCCharacterBondValue(
                              currentCharacterId,
                              value
                            )
                        : undefined
                    }
                    hasConnection={
                      npc.characterConnections?.[currentCharacterId ?? ""] ??
                      false
                    }
                    onConnectionToggle={
                      currentCharacterId
                        ? (connected) =>
                            updateNPCCharacterConnection(
                              currentCharacterId,
                              connected
                            ).catch(ignoreApiError)
                        : undefined
                    }
                    inheritedBondName={
                      isCharacterBondedToLocation
                        ? npcLocation?.name
                        : undefined
                    }
                  />
                )}
                <Grid item xs={12}>
                  <RtcRichTextEditor
                    id={npcId}
                    roomPrefix={`iron-fellowship-${worldId}-npc-gmnotes-`}
                    documentPassword={worldId}
                    onSave={(_documentId, notes) =>
                      updateNPCNotes
                        .mutateAsync({
                          npcId,
                          gmProperties: {
                            ...(npc.gmProperties ?? {}),
                            gmNotes: Array.from(notes),
                          },
                        })
                        .then(() => undefined)
                    }
                    initialValue={npc.gmProperties?.gmNotes}
                  />
                </Grid>
              </>
            )}
            {isGuidedGame && (
              <>
                {showGMTips && (
                  <Grid item xs={12}>
                    <GuideAndPlayerHeader breakContainer />
                  </Grid>
                )}
                <BondsSection
                  isStarforged={isStarforged}
                  onBondToggle={
                    currentCharacterId
                      ? (bonded) =>
                          updateNPCCharacterBond(
                            currentCharacterId,
                            bonded
                          ).catch(ignoreApiError)
                      : undefined
                  }
                  isBonded={singleplayerBond}
                  hasConnection={
                    npc.characterConnections?.[currentCharacterId ?? ""] ??
                    false
                  }
                  bondProgress={
                    npc.characterBondProgress?.[currentCharacterId ?? ""] ?? 0
                  }
                  difficulty={npc.rank}
                  updateBondProgressValue={
                    currentCharacterId
                      ? (value) =>
                          updateNPCCharacterBondValue(
                            currentCharacterId,
                            value
                          )
                      : undefined
                  }
                  onConnectionToggle={
                    currentCharacterId
                      ? (connected) =>
                          updateNPCCharacterConnection(
                            currentCharacterId,
                            connected
                          ).catch(ignoreApiError)
                      : undefined
                  }
                  inheritedBondName={
                    isCharacterBondedToLocation ? npcLocation?.name : undefined
                  }
                  npc={npc}
                  location={npcLocation}
                />
                {!npc.sharedWithPlayers && (
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      These notes are not yet visible to players because this
                      location is hidden from them.
                    </Alert>
                  </Grid>
                )}
                <Grid item xs={12}>
                  {(npc.notes || npc.notes === null) && (
                    <RtcRichTextEditor
                      id={npcId}
                      roomPrefix={`iron-fellowship-${worldId}-npc-`}
                      documentPassword={worldId}
                      onSave={(_documentId, notes) =>
                        updateNPCNotes
                          .mutateAsync({ npcId, notes })
                          .then(() => undefined)
                      }
                      initialValue={npc.notes || undefined}
                    />
                  )}
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </Box>
    </PageWithImage>
  );
}
