# Session Log Moves — Handoff

## What's been built

A session log move system for the Character Sheet's Session Log tab. Players click a move button, fill in context, roll dice, see the outcome, and confirm — which applies stat changes and logs the move event to the session feed.

---

## Implemented Moves

| Move | File | Roll stat | Outcome effects |
|---|---|---|---|
| Face Danger | `FaceDangerDialog.tsx` | Any stat | Strong: +1 Momentum; Weak: suffer move (−1 Health/Spirit/Momentum); Miss: Pay the Price |
| Secure an Advantage | `SecureAnAdvantageDialog.tsx` | Any stat | Strong: +2 Momentum AND +1 Adds; Weak: choose one; Miss: Pay the Price |
| Gather Information | `GatherInformationDialog.tsx` | Any stat (wits typical) | Strong: +2 Momentum; Weak: +1 Momentum; Miss: Pay the Price |
| Compel | `CompelDialog.tsx` | Heart/Iron/Shadow (grouped by approach) | Strong: +1 Momentum; Weak: +1 Momentum + counteroffer; Miss: Pay the Price |
| Aid Your Ally | `AidYourAllyDialog.tsx` | Any stat | Effects go to ally. Strong: ally +2 Momentum AND +1 Adds; Weak(combat): ally in control, you bad spot; Weak(non-combat): ally chooses one; Miss: Pay the Price |
| Check Your Gear | `CheckYourGearDialog.tsx` | +Supply (condition meter) | Strong: +1 Momentum; Weak: choose −1 Supply OR −2 Momentum; Miss: Pay the Price |

All moves are wired into `SessionLogSection.tsx` with a button in the moves bar.

---

## Shared Infrastructure

### Hooks

**`src/hooks/useMoveRoll.ts`** — The main shared hook. Call in every dialog.
Returns:
- `rollData` — current roll state (includes `momentumBurned?` after burn)
- `characterStats`, `adds`, `characterId`, `uid`
- `momentum`, `momentumResetValue`, `maxMomentum`, `currentMomentum` — `currentMomentum` is post-burn
- `burnScore`, `burnOutcome`, `canBurnMomentum`
- `updateCurrentCharacter`, `logStatChangeEvent` — for applying outcome effects
- `roll(statKey, statLabel, move, modifierOverride?)` — performs dice roll + records to game log. Use `modifierOverride` when rolling on a condition meter (like supply) instead of a stat.
- `burnMomentum()` — updates rollData with burn
- `applyBurnOnConfirm(move)` — call first in handleConfirm; resets momentum + updates game log if burned
- `logMove(move, playerContext, oracleResult?, outcomeDescription?)` — logs move to session log
- `resetRoll()` — call in handleClose

**`src/hooks/useMomentumBurn.ts`** — Used internally by `useMoveRoll`. You shouldn't need this directly.

### Shared Components (all in `SessionLogSection/`)

**`RollSummaryBox.tsx`** — Props: `{ rollData, momentum }`. Renders the roll breakdown box.

**`MomentumBurnAlerts.tsx`** — Props: `{ canBurnMomentum, momentum, momentumResetValue, burnOutcome, momentumBurned, onBurn }`. Renders the "Burn" offer alert and confirmation alert.

**`PayThePriceSection.tsx`** — Props: `{ missText, oracleResult, onOracleResult }`. Renders the miss error alert + Pay the Price / Story Complication oracle buttons + result display. Reads oracle maps and character/uid from store itself.

**`moveUtils.ts`** — Exports `getOutcomeLabel(outcome)` and `getOutcomeColor(outcome)`.

---

## How to add a new move dialog

### 1. Find the move ID

```bash
node -e "
const sf = require('./node_modules/@datasworn/starforged/json/starforged.json');
const cl = require('./node_modules/@datasworn/ironsworn-classic/json/classic.json');
for (const [cat, catData] of Object.entries({...sf.moves, ...cl.moves})) {
  for (const [key, move] of Object.entries(catData.contents || {})) {
    if (key.includes('YOUR_MOVE_KEY')) {
      console.log(move._id, '| roll_type:', move.roll_type);
      console.log('trigger:', JSON.stringify(move.trigger?.conditions?.map(c => ({stat: c.roll_options?.[0]?.stat, text: c.text}))));
    }
  }
}
"
```

### 2. Create the dialog file

Copy the minimal skeleton:

```tsx
import { useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, TextField, Tooltip, Typography } from "@mui/material";
import { useStore } from "stores/store";
import { ROLL_RESULT } from "types/DieRolls.type";
import { useMoveRoll } from "hooks/useMoveRoll";
import { MomentumBurnAlerts } from "./MomentumBurnAlerts";
import { RollSummaryBox } from "./RollSummaryBox";
import { PayThePriceSection } from "./PayThePriceSection";

const MY_MOVE_IDS = [
  "starforged/moves/CATEGORY/move_key",
  "classic/moves/CATEGORY/move_key",
];

type DialogStep = "setup" | "result";

export function MyMoveDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<DialogStep>("setup");
  const [playerContext, setPlayerContext] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [oracleResult, setOracleResult] = useState<{ label: string; result: string } | undefined>();
  const [confirming, setConfirming] = useState(false);

  const { rollData, characterStats, momentum, momentumResetValue, maxMomentum,
    burnScore, burnOutcome, canBurnMomentum, currentMomentum,
    updateCurrentCharacter, logStatChangeEvent,
    roll, burnMomentum, applyBurnOnConfirm, logMove, resetRoll } = useMoveRoll();

  const moveMap = useStore((s) => s.rules.moveMaps.moveMap);
  const statRules = useStore((s) => s.rules.stats);

  const move = useMemo(
    () => MY_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
    [moveMap]
  );

  // Build availableStats from move.trigger.conditions if it's an action_roll.
  // For fixed-stat moves (e.g. always +wits), just hardcode the stat key.
  const availableStats = useMemo(() => {
    const stats: string[] = [];
    if (move?.roll_type === "action_roll") {
      move.trigger.conditions.forEach((c) => {
        c.roll_options.forEach((o) => {
          if (o.using === "stat" && !stats.includes(o.stat)) stats.push(o.stat);
        });
      });
    }
    return stats;
  }, [move]);

  const handleRoll = (statKey: string) => {
    if (!move) return;
    roll(statKey, statRules[statKey]?.label ?? statKey, move);
    setStep("result");
  };

  const handleConfirm = async () => {
    if (!rollData || !move) return;
    setConfirming(true);
    try {
      await applyBurnOnConfirm(move);
      await logMove(move, playerContext, oracleResult, outcomeDescription);

      // Apply outcome effects using currentMomentum (post-burn):
      if (rollData.outcome === ROLL_RESULT.HIT) {
        // e.g. +1 momentum
        const newMomentum = Math.min(maxMomentum, currentMomentum + 1);
        if (newMomentum !== currentMomentum) {
          await updateCurrentCharacter({ momentum: newMomentum });
          logStatChangeEvent({ stat: "Momentum", previousValue: currentMomentum,
            newValue: newMomentum, cause: "My Move — Strong Hit" });
        }
      } else if (rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        // ...
      }
      // Miss: PayThePriceSection handles oracle; no auto stat change

      handleClose();
    } catch (e) { console.error(e); }
    finally { setConfirming(false); }
  };

  const handleClose = () => {
    if (confirming) return;
    setStep("setup"); setPlayerContext(""); setOutcomeDescription("");
    setOracleResult(undefined); resetRoll(); onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableEscapeKeyDown={confirming}>
      <DialogTitle>My Move</DialogTitle>
      <DialogContent>
        {step === "setup" && (
          <Box>
            {/* description field + stat buttons */}
            <TextField fullWidth size="small" multiline minRows={2}
              value={playerContext} onChange={(e) => setPlayerContext(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()} sx={{ mb: 2 }} />
            <Box display="flex" flexWrap="wrap" gap={1}>
              {availableStats.filter((sk) => statRules[sk]).map((statKey) => (
                <Tooltip key={statKey} title={!playerContext.trim() ? "Describe your action first" : ""}>
                  <span>
                    <Button variant="outlined" size="small"
                      disabled={!playerContext.trim()}
                      onClick={() => handleRoll(statKey)}>
                      {statRules[statKey].label} (+{characterStats?.[statKey] ?? 0})
                    </Button>
                  </span>
                </Tooltip>
              ))}
            </Box>
          </Box>
        )}
        {step === "result" && rollData && (
          <Box>
            <RollSummaryBox rollData={rollData} momentum={momentum} />
            <MomentumBurnAlerts canBurnMomentum={canBurnMomentum} momentum={momentum}
              momentumResetValue={momentumResetValue} burnOutcome={burnOutcome}
              momentumBurned={rollData.momentumBurned} onBurn={burnMomentum} />

            {rollData.outcome === ROLL_RESULT.HIT && <Alert severity="success" sx={{ mb: 2 }}>Strong hit text</Alert>}
            {rollData.outcome === ROLL_RESULT.WEAK_HIT && <Alert severity="warning" sx={{ mb: 2 }}>Weak hit text</Alert>}
            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection missText="Miss flavor text."
                oracleResult={oracleResult} onOracleResult={setOracleResult} />
            )}

            <TextField fullWidth size="small" multiline minRows={2}
              value={outcomeDescription} onChange={(e) => setOutcomeDescription(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={confirming}>{step === "setup" ? "Cancel" : "Back"}</Button>
        {step === "result" && (
          <Button variant="contained" onClick={handleConfirm} disabled={confirming}
            startIcon={confirming ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {confirming ? "Saving…" : "Confirm"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
```

### 3. Wire into SessionLogSection.tsx

Add to the imports, state, moves bar buttons, and dialog instances:

```tsx
// Import
import { MyMoveDialog } from "./MyMoveDialog";
import MyIcon from "@mui/icons-material/SomeIcon";

// State
const [myMoveOpen, setMyMoveOpen] = useState(false);

// Button in moves bar
<Button variant="outlined" size="small"
  startIcon={<MyIcon sx={{ fontSize: 14 }} />}
  onClick={() => setMyMoveOpen(true)}
  sx={{ fontSize: "0.75rem", py: 0.25 }}>
  My Move
</Button>

// Dialog instance (before the End Session dialog)
<MyMoveDialog open={myMoveOpen} onClose={() => setMyMoveOpen(false)} />
```

---

## Key store paths

| Data | Store path |
|---|---|
| Character stats | `s.characters.currentCharacter.currentCharacter?.stats` |
| Momentum | `s.characters.currentCharacter.currentCharacter?.momentum` |
| Momentum reset value | `s.characters.currentCharacter.momentumResetValue` |
| Adds | `s.characters.currentCharacter.currentCharacter?.adds` |
| Debilities | `s.characters.currentCharacter.currentCharacter?.debilities` |
| Condition meters (health/spirit) | `s.characters.currentCharacter.currentCharacter?.conditionMeters` |
| Campaign condition meters (shared supply) | `s.campaigns.currentCampaign.currentCampaign?.conditionMeters` |
| Campaign characters (allies) | `s.campaigns.currentCampaign.characters.characterMap` |
| Current character ID | `s.characters.currentCharacter.currentCharacterId` |
| Move map | `s.rules.moveMaps.moveMap` |
| Stat rules | `s.rules.stats` |
| Condition meter rules | `s.rules.conditionMeters` |
| Oracle map | `s.rules.oracleMaps.allOraclesMap` |

Key actions:
- `s.characters.currentCharacter.updateCurrentCharacter({ momentum, adds, ... })`
- `s.characters.currentCharacter.updateCharacterConditionMeter("health" | "spirit", value)`
- `s.campaigns.currentCampaign.updateCampaignConditionMeter("supply", value)`
- `s.campaigns.currentCampaign.characters.updateCharacter(characterId, partialDoc)`
- `s.sessionLog.logStatChangeEvent({ stat, previousValue, newValue, cause })`

---

## Special patterns

### Rolling on a condition meter (not a stat)
Pass `modifierOverride` to `roll()`:
```ts
roll("supply", "Supply", move, supplyValue);
```

### Approach-grouped stat buttons (like Compel)
Instead of dynamic stat buttons, hardcode the groups:
```ts
const APPROACH_GROUPS = [
  { statKey: "heart", approachLabel: "Charm, pacify, encourage, or barter" },
  { statKey: "iron",  approachLabel: "Threaten or incite" },
  { statKey: "shadow", approachLabel: "Lie or swindle" },
] as const;
```
Then render full-width buttons with approach text on the left, stat value on the right.

### Updating an ally's stats (Aid Your Ally pattern)
```ts
const updateAllyCharacter = useStore(
  (s) => s.campaigns.currentCampaign.characters.updateCharacter
);
await updateAllyCharacter(allyId, { momentum: newValue });
```

### Supply: shared vs character-owned
Check `conditionMeterRules["supply"].shared` — if true and in a campaign, read/write campaign condition meters; otherwise character condition meters.

### ROLL_RESULT enum
```ts
ROLL_RESULT.HIT = 0       // Strong Hit (best)
ROLL_RESULT.WEAK_HIT = 1  // Weak Hit
ROLL_RESULT.MISS = 2      // Miss (worst)
```
Lower = better. `burnOutcome < rollData.outcome` means burning improves the result.

### momentumTrack min/max
```ts
import { momentumTrack } from "data/defaultTracks";
// momentumTrack.max = 10, momentumTrack.min = -6
// Character max = momentumTrack.max - debilityCount
```

---

## Moves still to implement (likely candidates)

Starforged adventure moves not yet covered:
- **React Under Fire** — combat, +any stat; strong: OK + take control; weak: OK but at cost; miss: Pay the Price
- **Strike** — combat, +iron or +edge; strong: +2 progress; weak: +1 progress then Pay the Price; miss: Pay the Price
- **Clash** — combat, +iron or +edge; similar to Strike but reactive
- **Gain Ground** — combat, +any stat; strong: choose 2 (mark progress / +2 momentum / +1 adds); weak: choose 1; miss: Pay the Price
- **Battle** — +edge/iron/heart/shadow/wits; resolves a fight in one roll; complex outcomes
- **Swear an Iron Vow** — creates a vow (progress track); +heart
- **Reach a Milestone** / **Fulfill Your Vow** — progress roll against a vow track
- **Resupply** — +heart/iron/shadow/wits; strong: +2 supply; weak: +1; miss: Pay the Price

Classic-only:
- **Sojourn** — +heart; recover multiple stats
- **Draw the Circle** — +heart; initiate a formal duel
