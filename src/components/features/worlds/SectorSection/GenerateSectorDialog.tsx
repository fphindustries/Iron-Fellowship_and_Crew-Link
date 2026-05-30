import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { generateSectorContent } from "api/ai/generateSectorContent";
import { SectorGenerationSettlement } from "types/AI.type";
import { TiptapTransformer } from "@hocuspocus/transformer";
import * as Y from "yjs";
import { useState } from "react";
import { useStore } from "stores/store";
import { useRoller } from "stores/appState/useRoller";
import { GMLocation, LocationMap, MapEntryType } from "types/Locations.type";
import { Difficulty } from "types/Track.type";
import { CUSTOM_TRUTH_INDEX } from "components/features/worlds/WorldTruths/customTruthIndex";
import {
  useCreateLocationMutation,
  useCreateNPCMutation,
  useUpdateLocationMutation,
  useUpdateLocationNotesMutation,
  useUpdateNPCNotesMutation,
} from "hooks/queries/useWorldEntitiesQuery";
import { useWorldAiSettingsQuery } from "hooks/queries/useWorldsQuery";

const SETTLEMENT_COUNT: Record<string, number> = {
  Terminus: 4,
  Outlands: 3,
  Expanse: 2,
};

const PASSAGE_COUNT: Record<string, number> = {
  Terminus: 3,
  Outlands: 2,
  Expanse: 1,
};

const CONNECTION_RANKS = [Difficulty.Troublesome, Difficulty.Dangerous];

function textToYjsBytes(text: string): Uint8Array {
  const paragraphs = text
    .split(/\n\n+/)
    .filter(Boolean)
    .map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] }));
  const tiptapJson = { type: "doc", content: paragraphs };
  const ydoc = TiptapTransformer.toYdoc(tiptapJson, "default");
  return Y.encodeStateAsUpdate(ydoc);
}

function getSettlementType(
  locationType: string
): "planetsideSettlement" | "orbitalSettlement" {
  const lower = locationType.toLowerCase();
  if (lower.includes("planet")) {
    return "planetsideSettlement";
  }
  return "orbitalSettlement";
}

// Hex grid placement helpers
// Default sector map is 13 rows (0-12) × 18 cols (0-17 even, 0-16 odd)
const ROW_MIN = 1;
const ROW_MAX = 11;
const COL_MIN = 2;
const COL_MAX = 14; // safe for both even and odd rows

interface HexPos {
  row: number;
  col: number;
}

function posKey({ row, col }: HexPos): string {
  return `${row},${col}`;
}

function isValidPos({ row, col }: HexPos): boolean {
  const maxCol = row % 2 === 1 ? COL_MAX - 1 : COL_MAX;
  return row >= ROW_MIN && row <= ROW_MAX && col >= COL_MIN && col <= maxCol;
}

function hexNeighbors({ row, col }: HexPos): HexPos[] {
  if (row % 2 === 0) {
    return [
      { row: row - 1, col: col - 1 },
      { row: row - 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
      { row: row + 1, col: col - 1 },
      { row: row + 1, col },
    ];
  } else {
    return [
      { row: row - 1, col },
      { row: row - 1, col: col + 1 },
      { row, col: col - 1 },
      { row, col: col + 1 },
      { row: row + 1, col },
      { row: row + 1, col: col + 1 },
    ];
  }
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function oneOrTwoResults(roll: () => string): string {
  const count = Math.random() < 0.5 ? 1 : 2;
  const results = Array.from({ length: count }, roll).filter(Boolean);
  return [...new Set(results)].join(", ");
}

function biomeCountForDiversity(diversity: string): number {
  const lower = diversity.toLowerCase();
  if (lower.includes("simple")) return 2;
  if (lower.includes("diverse")) return 3;
  if (lower.includes("complex")) return 4;
  if (lower.includes("garden")) return 5;
  return 0;
}

interface SettlementPlacement {
  settlement: SectorGenerationSettlement;
  pos: HexPos;
  planetPos?: HexPos;
}

function planPlacements(
  settlements: SectorGenerationSettlement[]
): SettlementPlacement[] {
  const occupied = new Set<string>();
  const placements: SettlementPlacement[] = [];

  for (const s of settlements) {
    const hasPlanet =
      s.locationType === "Orbital" || s.locationType === "Planetside";

    // Find a free settlement position
    let sPos: HexPos | undefined;
    for (let attempt = 0; attempt < 100; attempt++) {
      const row =
        Math.floor(Math.random() * (ROW_MAX - ROW_MIN + 1)) + ROW_MIN;
      const maxCol = row % 2 === 1 ? COL_MAX - 1 : COL_MAX;
      const col =
        Math.floor(Math.random() * (maxCol - COL_MIN + 1)) + COL_MIN;
      const candidate = { row, col };
      if (!occupied.has(posKey(candidate))) {
        sPos = candidate;
        break;
      }
    }
    if (!sPos) continue;
    occupied.add(posKey(sPos));

    // Find a free adjacent position for the planet
    let planetPos: HexPos | undefined;
    if (hasPlanet) {
      for (const candidate of shuffled(hexNeighbors(sPos))) {
        if (isValidPos(candidate) && !occupied.has(posKey(candidate))) {
          planetPos = candidate;
          occupied.add(posKey(candidate));
          break;
        }
      }
    }

    placements.push({ settlement: s, pos: sPos, planetPos });
  }

  return placements;
}

// Passage (path) generation helpers
// Uses the full 13×18 grid (0-indexed), not just the safe interior zone

const FULL_ROW_MAX = 12;

function maxColForFullRow(row: number): number {
  return row % 2 === 0 ? 17 : 16;
}

function isInFullGrid({ row, col }: HexPos): boolean {
  return (
    row >= 0 && row <= FULL_ROW_MAX && col >= 0 && col <= maxColForFullRow(row)
  );
}

function isEdgeCell({ row, col }: HexPos): boolean {
  return (
    row === 0 ||
    row === FULL_ROW_MAX ||
    col === 0 ||
    col === maxColForFullRow(row)
  );
}

// BFS shortest path on the hex grid.
// toPos = null means "find any edge cell" (passage leading off-map).
// Returns intermediate path cells — settlement hexes themselves are excluded
// since the renderer connects adjacent path cells to location cells automatically.
function findHexPath(
  from: HexPos,
  toPos: HexPos | null,
  locationCells: Set<string>
): HexPos[] {
  const blocked = new Set(locationCells);
  blocked.delete(posKey(from));
  if (toPos) blocked.delete(posKey(toPos));

  const queue: HexPos[][] = [[from]];
  const visited = new Set<string>([posKey(from)]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    for (const neighbor of hexNeighbors(current)) {
      if (!isInFullGrid(neighbor)) continue;
      const key = posKey(neighbor);
      if (visited.has(key) || blocked.has(key)) continue;

      const newPath = [...path, neighbor];

      const reachedGoal = toPos ? key === posKey(toPos) : isEdgeCell(neighbor);
      if (reachedGoal) {
        // Inter-settlement: strip both endpoints (they stay as Location cells).
        // Edge passage: strip only the starting settlement; keep the edge cell.
        return toPos ? newPath.slice(1) : newPath.slice(1);
      }

      visited.add(key);
      queue.push(newPath);
    }
  }
  return [];
}

function planPassages(
  placements: SettlementPlacement[],
  locationCells: Set<string>,
  passageCount: number
): HexPos[][] {
  const positions = placements.map((p) => p.pos);
  const passages: HexPos[][] = [];
  const used = new Set<string>();

  const addPassage = (
    from: HexPos,
    to: HexPos | null,
    key: string
  ): boolean => {
    if (used.has(key) || passages.length >= passageCount) return false;
    const path = findHexPath(from, to, locationCells);
    if (path.length === 0) return false;
    passages.push(path);
    used.add(key);
    return true;
  };

  // Include one passage off-map when possible, then add settlement-to-settlement
  // routes until the region's rulebook count is reached.
  for (const index of shuffled(positions.map((_, i) => i))) {
    if (addPassage(positions[index], null, `edge-${index}`)) break;
  }

  const pairIndexes: Array<[number, number]> = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      pairIndexes.push([i, j]);
    }
  }
  for (const [i, j] of shuffled(pairIndexes)) {
    addPassage(positions[i], positions[j], `pair-${i}-${j}`);
  }

  for (const index of shuffled(positions.map((_, i) => i))) {
    addPassage(positions[index], null, `edge-${index}`);
  }

  return passages;
}

export interface GenerateSectorDialogProps {
  open: boolean;
  onClose: () => void;
}

export function GenerateSectorDialog(props: GenerateSectorDialogProps) {
  const { open, onClose } = props;

  const [region, setRegion] = useState("Outlands");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const { rollOracleTable } = useRoller();

  const worldId = useStore((s) => s.worlds.currentWorld.currentWorldId);
  const createLocation = useCreateLocationMutation(worldId);
  const updateLocation = useUpdateLocationMutation(worldId);
  const updateLocationNotes = useUpdateLocationNotesMutation(worldId);
  const createNPC = useCreateNPCMutation(worldId);
  const updateNPCNotes = useUpdateNPCNotesMutation(worldId);
  const setOpenLocationId = useStore(
    (s) => s.worlds.currentWorld.currentWorldLocations.setOpenLocationId
  );

  const world = useStore((s) => s.worlds.currentWorld.currentWorld);
  const worldTruths = useStore((s) => s.rules.worldTruths);
  const { data: worldAiSettings } = useWorldAiSettingsQuery(worldId);
  const oracleCollectionMap = useStore(
    (s) => s.rules.oracleMaps.oracleCollectionMap
  );

  const createSpecificLocation = async (
    location: Record<string, unknown> & { name?: string; imageFilenames?: string[] }
  ) => {
    const {
      name,
      imageFilenames,
      updatedDate: _updatedDate,
      createdDate: _createdDate,
      ...dataJson
    } = location;
    const row = await createLocation.mutateAsync({
      name: name ?? "New Location",
      imageFilenames: imageFilenames ?? [],
      dataJson,
    });
    return row.id as string;
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(undefined);

    try {
      const roll = (oracleId: string): string =>
        rollOracleTable(oracleId, false)?.result ?? "";

      // 1. Roll sector name
      const prefix = roll("starforged/oracles/space/sector_name/prefix");
      const suffix = roll("starforged/oracles/space/sector_name/suffix");
      const sectorName =
        prefix && suffix ? `${prefix} ${suffix}` : "New Sector";

      // 2. Roll sector trouble
      const trouble = roll("starforged/oracles/campaign_launch/sector_trouble");

      // 3. Roll settlements
      const count = SETTLEMENT_COUNT[region] ?? 3;
      const passageCount = PASSAGE_COUNT[region] ?? 2;
      const regionLower = region.toLowerCase();
      const settlements: SectorGenerationSettlement[] = [];
      const stars: { settlementName: string; stellarObject: string }[] = [];

      for (let i = 0; i < count; i++) {
        const name = roll("starforged/oracles/settlements/name") || `Settlement ${i + 1}`;
        const locationType =
          roll("starforged/oracles/settlements/location") || "Deep Space";
        const population = roll(
          `starforged/oracles/settlements/population/${regionLower}`
        );
        const authority = roll("starforged/oracles/settlements/authority");
        const projects = oneOrTwoResults(() =>
          roll("starforged/oracles/settlements/projects")
        );

        let planet: SectorGenerationSettlement["planet"];
        if (locationType === "Orbital" || locationType === "Planetside") {
          const rawClass = roll("starforged/oracles/planets/class");
          const convertedClass = rawClass.split(" ")[0].toLowerCase();
          const planetName =
            roll(`starforged/oracles/planets/${convertedClass}/name`) ||
            "Unknown Planet";
          planet = {
            name: planetName,
            className: rawClass || "Rocky World",
          };
        }

        settlements.push({
          name,
          locationType,
          population,
          authority,
          projects,
          planet,
        });

        const stellarObject = roll("starforged/oracles/space/stellar_object");
        if (stellarObject) stars.push({ settlementName: name, stellarObject });
      }

      const focusSettlementIndex = Math.max(
        0,
        settlements.findIndex((settlement) => settlement.planet)
      );
      const focusSettlement = settlements[focusSettlementIndex];
      if (focusSettlement) {
        focusSettlement.isFocus = true;
        focusSettlement.firstLook = oneOrTwoResults(() =>
          roll("starforged/oracles/settlements/first_look")
        );
        focusSettlement.trouble = roll("starforged/oracles/settlements/trouble");

        if (focusSettlement.planet) {
          const convertedClass = focusSettlement.planet.className
            .split(" ")[0]
            .toLowerCase();
          focusSettlement.planet.atmosphere = roll(
            `starforged/oracles/planets/${convertedClass}/atmosphere`
          );
          focusSettlement.planet.observedFromSpace = oneOrTwoResults(() =>
            roll(`starforged/oracles/planets/${convertedClass}/observed_from_space`)
          );
          focusSettlement.planet.feature = oneOrTwoResults(() =>
            roll(`starforged/oracles/planets/${convertedClass}/feature`)
          );
          focusSettlement.planet.life = roll(
            `starforged/oracles/planets/${convertedClass}/life`
          );
          if (convertedClass === "vital") {
            const diversity = roll(
              "starforged/oracles/planets/vital/diversity"
            );
            const biomeCount = biomeCountForDiversity(diversity);
            const biomes = Array.from({ length: biomeCount }, () =>
              roll("starforged/oracles/planets/vital/biomes")
            ).filter(Boolean);
            focusSettlement.planet.diversity = diversity;
            focusSettlement.planet.biomes = [...new Set(biomes)].join(", ");
          }
        }
      }

      // 4. Roll NPC
      const givenName =
        roll("starforged/oracles/characters/name/given") || "Asha";
      const familyName = roll("starforged/oracles/characters/name/family_name");
      const npcName = [givenName, familyName].filter(Boolean).join(" ");
      const npcRole =
        roll("starforged/oracles/characters/role") || "Spacer";
      const npcRank =
        CONNECTION_RANKS[Math.floor(Math.random() * CONNECTION_RANKS.length)];

      // 5. Build world context from saved truths
      const truthSelections = world?.newTruths ?? {};
      const selectedTruths = Object.keys(worldTruths)
        .map((key) => {
          const truth = worldTruths[key];
          const selection = truthSelections[key];
          if (!selection) return null;
          let description: string;
          if (selection.selectedTruthOptionIndex === CUSTOM_TRUTH_INDEX) {
            description = selection.customTruth?.description ?? "";
          } else {
            description =
              truth.options[selection.selectedTruthOptionIndex ?? 0]
                ?.description ?? "";
          }
          return { name: truth.name, description };
        })
        .filter(
          (t): t is { name: string; description: string } =>
            t !== null && t.description.length > 0
        );

      // 6. Call Cloud Function for AI descriptions
      const aiResult = await generateSectorContent({
        sectorName,
        region,
        trouble,
        passageCount,
        focusSettlementIndex,
        settlements,
        npc: {
          name: npcName,
          role: npcRole,
          rank: npcRank,
          homeSettlementName: focusSettlement?.name,
        },
        stars,
        worldContext: {
          truths: selectedTruths,
          assumptions: worldAiSettings?.assumptions,
        },
      });

      // 7. Create sector as a top-level Location in /worlds/{worldId}/locations/
      const now = new Date();
      const sectorLocationId = await createSpecificLocation({
        name: sectorName,
        type: "sector",
        sharedWithPlayers: true,
        showMap: true,
        fields: { region },
        createdDate: now,
        updatedDate: now,
      });
      // Store trouble + GM narrative notes in sector GM properties
      const sectorGMProps: Partial<GMLocation> = {};
      if (trouble) sectorGMProps.fields = { sectorTrouble: trouble };
      if (Object.keys(sectorGMProps).length > 0) {
        await updateLocationNotes.mutateAsync({
          locationId: sectorLocationId,
          gmProperties: sectorGMProps,
        });
      }
      if (aiResult?.sectorPublicSummary) {
        await updateLocationNotes.mutateAsync({
          locationId: sectorLocationId,
          notes: textToYjsBytes(aiResult.sectorPublicSummary),
        });
      }
      if (aiResult?.sectorGMNotes) {
        const launchPacket = aiResult.launchPacket
          ? [
              aiResult.sectorGMNotes,
              "",
              "Launch packet",
              "",
              `Opening scene: ${aiResult.launchPacket.openingScene}`,
              "",
              `Visible trouble: ${aiResult.launchPacket.visibleTrouble}`,
              "",
              `Rumors: ${aiResult.launchPacket.rumors.join("; ")}`,
              "",
              `Quest starters: ${aiResult.launchPacket.questStarters.join("; ")}`,
              "",
              `First-session questions: ${aiResult.launchPacket.firstSessionQuestions.join("; ")}`,
            ].join("\n")
          : aiResult.sectorGMNotes;
        await updateLocationNotes.mutateAsync({
          locationId: sectorLocationId,
          privateNotes: textToYjsBytes(launchPacket),
        });
      }

      // 8. Plan random hex positions, then create settlements and planets
      const placements = planPlacements(settlements);
      const sectorMap: LocationMap = {};
      let focusSettlementLocationId: string | undefined;

      for (let i = 0; i < placements.length; i++) {
        const { settlement: s, pos, planetPos } = placements[i];

        // Create settlement
        const settlementType = getSettlementType(s.locationType);
        const settlementLocationId = await createSpecificLocation({
          name: s.name,
          type: settlementType,
          parentLocationId: sectorLocationId,
          sharedWithPlayers: true,
          createdDate: now,
          updatedDate: now,
        });
        // All settlement oracle fields are gmFields in the config
        const settlementGMFields: Record<string, string> = {};
        if (s.locationType) settlementGMFields.settlementLocation = s.locationType;
        if (s.firstLook) settlementGMFields.settlementFirstLook = s.firstLook;
        if (s.population) settlementGMFields.settlementPopulation = s.population;
        if (s.authority) settlementGMFields.settlementAuthority = s.authority;
        if (s.projects) settlementGMFields.settlementProjects = s.projects;
        if (s.trouble) settlementGMFields.settlementTrouble = s.trouble;
        if (Object.keys(settlementGMFields).length > 0) {
          await updateLocationNotes.mutateAsync({
            locationId: settlementLocationId,
            gmProperties: { fields: settlementGMFields },
          });
        }
        if (s.isFocus) focusSettlementLocationId = settlementLocationId;

        // Place on sector hex map at random position
        sectorMap[pos.row] = sectorMap[pos.row] ?? {};
        sectorMap[pos.row][pos.col] = {
          type: MapEntryType.Location,
          locationIds: [settlementLocationId],
        };

        // Write AI public description to player-facing notes
        const settlementOutput = aiResult?.settlementOutputs?.[i];
        if (settlementOutput?.publicDescription) {
          const bytes = textToYjsBytes(settlementOutput.publicDescription);
          await updateLocationNotes.mutateAsync({
            locationId: settlementLocationId,
            notes: bytes,
          });
        }
        // Write AI GM notes to GM-only properties
        if (settlementOutput?.gmNotes) {
          await updateLocationNotes.mutateAsync({
            locationId: settlementLocationId,
            privateNotes: textToYjsBytes(settlementOutput.gmNotes),
          });
        }

        // Create planet for Orbital/Planetside settlements
        if (s.planet) {
          const convertedClass = s.planet.className.split(" ")[0].toLowerCase();
          const collectionId = `starforged/collections/oracles/planets/${convertedClass}`;
          const oracleSummary =
            oracleCollectionMap[collectionId]?.summary ?? undefined;

          const planetFields: Record<string, string> = {
            planetClass: s.planet.className,
          };
          if (oracleSummary) planetFields.planetDescription = oracleSummary;

          const planetLocationId = await createSpecificLocation({
            name: s.planet.name,
            type: "planet",
            parentLocationId: sectorLocationId,
            sharedWithPlayers: true,
            fields: planetFields,
            createdDate: now,
            updatedDate: now,
          });
          const planetGMFields: Record<string, string> = {};
          if (s.planet.atmosphere) {
            planetGMFields.planetAtmosphere = s.planet.atmosphere;
          }
          if (s.planet.observedFromSpace) {
            planetGMFields.planetObservedFromSpace = s.planet.observedFromSpace;
          }
          if (s.planet.feature) {
            planetGMFields.planetFeature = s.planet.feature;
          }
          if (s.planet.life) {
            planetGMFields.planetLife = s.planet.life;
          }
          if (s.planet.diversity) {
            planetGMFields.planetDiversity = s.planet.diversity;
          }
          if (s.planet.biomes) {
            planetGMFields.planetBiomes = s.planet.biomes;
          }
          if (Object.keys(planetGMFields).length > 0) {
            await updateLocationNotes.mutateAsync({
              locationId: planetLocationId,
              gmProperties: {
                fields: planetGMFields,
              },
            });
          }
          // Write AI planet description to player-facing notes
          if (settlementOutput?.planetDescription) {
            const bytes = textToYjsBytes(settlementOutput.planetDescription);
            await updateLocationNotes.mutateAsync({
              locationId: planetLocationId,
              notes: bytes,
            });
          }

          // Place planet on map adjacent to its settlement (if a free hex was found)
          if (planetPos) {
            sectorMap[planetPos.row] = sectorMap[planetPos.row] ?? {};
            sectorMap[planetPos.row][planetPos.col] = {
              type: MapEntryType.Location,
              locationIds: [planetLocationId],
            };
          }
        }
      }

      // 9. Add passages to the sector map
      const locationCells = new Set<string>();
      placements.forEach(({ pos, planetPos }) => {
        locationCells.add(posKey(pos));
        if (planetPos) locationCells.add(posKey(planetPos));
      });

      const passages = planPassages(placements, locationCells, passageCount);
      for (const passage of passages) {
        for (const cell of passage) {
          if (!locationCells.has(posKey(cell))) {
            sectorMap[cell.row] = sectorMap[cell.row] ?? {};
            sectorMap[cell.row][cell.col] = { type: MapEntryType.Path };
          }
        }
      }

      // Update sector with completed hex map (locations + passages)
      await updateLocation.mutateAsync({
        locationId: sectorLocationId,
        patch: {
          dataJson: {
            type: "sector",
            sharedWithPlayers: true,
            showMap: true,
            fields: { region },
            map: sectorMap,
          },
        },
      });

      // 10. Create NPC connection
      const npcRow = await createNPC.mutateAsync({
        name: npcName,
        dataJson: {
          sharedWithPlayers: true,
          rank: npcRank,
          lastLocationId: focusSettlementLocationId,
        },
      });
      const npcId = npcRow.id as string;
      await updateNPCNotes.mutateAsync({
        npcId,
        gmProperties: {
          role: npcRole,
          ...(aiResult?.npcFirstLook ? { firstLook: aiResult.npcFirstLook } : {}),
          ...(aiResult?.npcGoal ? { goal: aiResult.npcGoal } : {}),
          ...(aiResult?.npcRevealedAspect
            ? { revealedAspect: aiResult.npcRevealedAspect }
            : {}),
        },
      });

      if (aiResult?.npcPublicDescription) {
        const bytes = textToYjsBytes(aiResult.npcPublicDescription);
        await updateNPCNotes.mutateAsync({ npcId, notes: bytes });
      }

      // 11. Open the new sector in the Locations section
      setOpenLocationId(sectorLocationId);
      onClose();
    } catch (e) {
      console.error("Generate sector failed", e);
      setError("Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Generate Sector</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Rolls oracle tables and uses AI to generate a starting sector with
          settlements, planets, and a connection NPC — following the Starforged
          campaign launch exercise.
        </Typography>
        <FormControl fullWidth>
          <InputLabel id="generate-sector-region-label">Region</InputLabel>
          <Select
            labelId="generate-sector-region-label"
            label="Region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={loading}
          >
            <MenuItem value="Terminus">Terminus (4 settlements)</MenuItem>
            <MenuItem value="Outlands">Outlands (3 settlements)</MenuItem>
            <MenuItem value="Expanse">Expanse (2 settlements)</MenuItem>
          </Select>
        </FormControl>
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={loading}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {loading ? "Generating..." : "Generate"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
