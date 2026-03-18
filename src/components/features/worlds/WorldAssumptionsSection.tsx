import { Box, Button, TextField, Typography } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "stores/store";
import { ignoreApiError } from "api-calls/createApiFunction";

const DEFAULT_ASSUMPTIONS = `This is a perilous future. Two centuries ago, your people fled a cataclysm and settled a distant galaxy they call the Forge. This is a chaotic place full of dangers and mysteries.
This is a lonely future. With some possible exceptions (that you'll identify as part of your own truths), humans are the only known intelligent life in this galaxy. Others once lived here, but only mysterious and perilous vaults remain to mark their legacy.
This is a diverse future. There is a vibrant mix of people and cultures among the humans of the Forge.
This is a far-flung future. Settlements lie scattered and often isolated from one another. Your starship can travel at faster-than-light speeds, but it's ponderously slow at a cosmic scale.
This is an unexplored future. Discoveries await. Even in settled regions, much of the Forge is unknown and uncharted.
This is a wondrous future. The Forge is a galaxy of ancient mysteries, spacefaring creatures, startling phenomenon, and other marvels.
This is a retro-future. Envision the technology you wield as only slightly advanced over today's real-world technologies—or even a step back in many ways. Resources are scarce, and the people of the Forge must cobble together what they can.
This is an unjust future. Those in power hoard resources, control technologies, and impose their will on others through force or cunning. Others must stand against these forces of imperialism and oppression.
This is a hopeful future. Despite these challenges, hope remains. Fulfilling your sworn vows is a realization of that hope.`;

export function WorldAssumptionsSection() {
  const settings = useStore(
    (store) => store.worlds.currentWorld.worldAiSettings
  );
  const updateSettings = useStore(
    (store) => store.worlds.currentWorld.updateWorldAiSettings
  );

  const [assumptions, setAssumptions] = useState(
    settings?.assumptions ?? DEFAULT_ASSUMPTIONS
  );

  // Only sync from store on initial load; ignore subsequent subscription updates
  // so in-progress edits are not overwritten by Firestore round-trips.
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (settings && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setAssumptions(settings.assumptions ?? DEFAULT_ASSUMPTIONS);
    }
  }, [settings]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const debouncedSave = useCallback(
    (value: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        updateSettings({ assumptions: value }).catch(ignoreApiError);
      }, 800);
    },
    [updateSettings]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleChange = (value: string) => {
    setAssumptions(value);
    debouncedSave(value);
  };

  const handleReset = () => {
    handleChange(DEFAULT_ASSUMPTIONS);
  };

  const isDefault = assumptions === DEFAULT_ASSUMPTIONS;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        World Assumptions
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        These are the foundational truths about the setting that are included in
        every AI Guide prompt. Edit them to reflect your campaign&apos;s unique
        version of the Forge, or reset to the Starforged defaults.
      </Typography>

      <TextField
        multiline
        fullWidth
        minRows={10}
        maxRows={24}
        value={assumptions}
        onChange={(e) => handleChange(e.target.value)}
        helperText="Included in all AI Guide prompts as cached context."
      />

      <Box mt={1.5}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={handleReset}
          disabled={isDefault}
        >
          Reset to Defaults
        </Button>
      </Box>
    </Box>
  );
}
