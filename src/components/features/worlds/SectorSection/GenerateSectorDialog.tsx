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
import { LocationMap, MapEntryType } from "types/Locations.type";
import { Difficulty } from "types/Track.type";
import { CUSTOM_TRUTH_INDEX } from "components/features/worlds/WorldTruths/customTruthIndex";

const SETTLEMENT_COUNT: Record<string, number> = {
  Terminus: 4,
  Outlands: 3,
  Expanse: 2,
};

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
  locationCells: Set<string>
): HexPos[][] {
  const positions = placements.map((p) => p.pos);
  const passages: HexPos[][] = [];

  // Connect all settlements in a chain (0→1, 1→2, ...) so every settlement is reachable
  for (let i = 0; i < positions.length - 1; i++) {
    const path = findHexPath(positions[i], positions[i + 1], locationCells);
    if (path.length > 0) passages.push(path);
  }

  // Always add one passage leading out of the sector to the map edge
  for (let i = 0; i < positions.length; i++) {
    const path = findHexPath(positions[i], null, locationCells);
    if (path.length > 0) {
      passages.push(path);
      break;
    }
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

  const createSpecificLocation = useStore(
    (s) => s.worlds.currentWorld.currentWorldLocations.createSpecificLocation
  );
  const updateLocation = useStore(
    (s) => s.worlds.currentWorld.currentWorldLocations.updateLocation
  );
  const updateLocationGMProperties = useStore(
    (s) =>
      s.worlds.currentWorld.currentWorldLocations.updateLocationGMProperties
  );
  const updateLocationNotes = useStore(
    (s) => s.worlds.currentWorld.currentWorldLocations.updateLocationNotes
  );
  const setOpenLocationId = useStore(
    (s) => s.worlds.currentWorld.currentWorldLocations.setOpenLocationId
  );
  const createNPC = useStore(
    (s) => s.worlds.currentWorld.currentWorldNPCs.createNPC
  );
  const updateNPCGMProperties = useStore(
    (s) => s.worlds.currentWorld.currentWorldNPCs.updateNPCGMProperties
  );
  const updateNPCNotes = useStore(
    (s) => s.worlds.currentWorld.currentWorldNPCs.updateNPCNotes
  );

  const world = useStore((s) => s.worlds.currentWorld.currentWorld);
  const worldTruths = useStore((s) => s.rules.worldTruths);
  const worldAiSettings = useStore(
    (s) => s.worlds.currentWorld.worldAiSettings
  );
  const oracleCollectionMap = useStore(
    (s) => s.rules.oracleMaps.oracleCollectionMap
  );

  const handleGenerate = async () => {
    setLoading(true);
    setError(undefined);

    try {
      // 1. Roll sector name
      const prefix =
        rollOracleTable(
          "starforged/oracles/space/sector_name/prefix",
          false
        )?.result ?? "";
      const suffix =
        rollOracleTable(
          "starforged/oracles/space/sector_name/suffix",
          false
        )?.result ?? "";
      const sectorName =
        prefix && suffix ? `${prefix} ${suffix}` : "New Sector";

      // 2. Roll sector trouble
      const trouble =
        rollOracleTable(
          "starforged/oracles/campaign_launch/sector_trouble",
          false
        )?.result ?? "";

      // 3. Roll settlements
      const count = SETTLEMENT_COUNT[region] ?? 3;
      const regionLower = region.toLowerCase();
      const settlements: SectorGenerationSettlement[] = [];

      for (let i = 0; i < count; i++) {
        const name =
          rollOracleTable("starforged/oracles/settlements/name", false)
            ?.result ?? `Settlement ${i + 1}`;
        const locationType =
          rollOracleTable("starforged/oracles/settlements/location", false)
            ?.result ?? "Deep Space";
        const population =
          rollOracleTable(
            `starforged/oracles/settlements/population/${regionLower}`,
            false
          )?.result ?? "";
        const authority =
          rollOracleTable("starforged/oracles/settlements/authority", false)
            ?.result ?? "";
        const project1 =
          rollOracleTable("starforged/oracles/settlements/projects", false)
            ?.result ?? "";
        const project2 =
          rollOracleTable("starforged/oracles/settlements/projects", false)
            ?.result ?? "";
        const projects = [project1, project2].filter(Boolean).join(", ");
        const settlementTrouble =
          rollOracleTable("starforged/oracles/settlements/trouble", false)
            ?.result ?? "";

        let planet: SectorGenerationSettlement["planet"];
        if (locationType === "Orbital" || locationType === "Planetside") {
          const rawClass =
            rollOracleTable("starforged/oracles/planets/class", false)
              ?.result ?? "";
          const convertedClass = rawClass.split(" ")[0].toLowerCase();
          const planetName =
            rollOracleTable(
              `starforged/oracles/planets/${convertedClass}/name`,
              false
            )?.result ?? "Unknown Planet";
          const atmosphere =
            rollOracleTable(
              `starforged/oracles/planets/${convertedClass}/atmosphere`,
              false
            )?.result;
          planet = {
            name: planetName,
            className: rawClass || "Rocky World",
            atmosphere,
          };
        }

        settlements.push({
          name,
          locationType,
          population,
          authority,
          projects,
          trouble: settlementTrouble,
          planet,
        });
      }

      // 4. Roll NPC
      const givenName =
        rollOracleTable(
          "starforged/oracles/characters/name/given",
          false
        )?.result ?? "Asha";
      const familyName =
        rollOracleTable(
          "starforged/oracles/characters/name/family_name",
          false
        )?.result ?? "";
      const npcName = [givenName, familyName].filter(Boolean).join(" ");
      const npcRole =
        rollOracleTable("starforged/oracles/characters/role", false)?.result ??
        "Spacer";

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
        settlements,
        npc: { name: npcName, role: npcRole },
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
      // Store trouble in GM properties (it's a gmField in sector config)
      if (trouble) {
        await updateLocationGMProperties(sectorLocationId, {
          fields: { sectorTrouble: trouble },
        });
      }

      // 8. Plan random hex positions, then create settlements and planets
      const placements = planPlacements(settlements);
      const sectorMap: LocationMap = {};

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
        if (s.population) settlementGMFields.settlementPopulation = s.population;
        if (s.authority) settlementGMFields.settlementAuthority = s.authority;
        if (s.projects) settlementGMFields.settlementProjects = s.projects;
        if (s.trouble) settlementGMFields.settlementTrouble = s.trouble;
        if (Object.keys(settlementGMFields).length > 0) {
          await updateLocationGMProperties(settlementLocationId, {
            fields: settlementGMFields,
          });
        }

        // Place on sector hex map at random position
        sectorMap[pos.row] = sectorMap[pos.row] ?? {};
        sectorMap[pos.row][pos.col] = {
          type: MapEntryType.Location,
          locationIds: [settlementLocationId],
        };

        // Write AI description to player notes
        const descText = aiResult?.settlementDescriptions?.[i];
        if (descText) {
          const bytes = textToYjsBytes(descText);
          await updateLocationNotes(settlementLocationId, bytes, false);
        }

        // Create planet for Orbital/Planetside settlements
        if (s.planet) {
          const convertedClass = s.planet.className.split(" ")[0].toLowerCase();
          const collectionId = `starforged/collections/oracles/planets/${convertedClass}`;
          const planetDescription =
            oracleCollectionMap[collectionId]?.summary ?? undefined;

          const planetFields: Record<string, string> = {
            planetClass: s.planet.className,
          };
          if (planetDescription) planetFields.planetDescription = planetDescription;

          const planetLocationId = await createSpecificLocation({
            name: s.planet.name,
            type: "planet",
            parentLocationId: sectorLocationId,
            sharedWithPlayers: true,
            fields: planetFields,
            createdDate: now,
            updatedDate: now,
          });
          // Atmosphere is a gmField in planet config
          if (s.planet.atmosphere) {
            await updateLocationGMProperties(planetLocationId, {
              fields: { planetAtmosphere: s.planet.atmosphere },
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

      const passages = planPassages(placements, locationCells);
      for (const passage of passages) {
        for (const cell of passage) {
          if (!locationCells.has(posKey(cell))) {
            sectorMap[cell.row] = sectorMap[cell.row] ?? {};
            sectorMap[cell.row][cell.col] = { type: MapEntryType.Path };
          }
        }
      }

      // Update sector with completed hex map (locations + passages)
      await updateLocation(sectorLocationId, {
        map: sectorMap,
        updatedDate: now,
      });

      // 10. Create NPC connection
      const npcId = await createNPC({
        name: npcName,
        sharedWithPlayers: true,
        rank: Difficulty.Dangerous,
      });
      await updateNPCGMProperties(npcId, { role: npcRole });

      const npcDescText = aiResult?.npcDescription;
      if (npcDescText) {
        const bytes = textToYjsBytes(npcDescText);
        await updateNPCNotes(npcId, bytes);
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
