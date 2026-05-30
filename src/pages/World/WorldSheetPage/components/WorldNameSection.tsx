import { TextField } from "@mui/material";
import { SectionHeading } from "components/shared/SectionHeading";
import { useEffect, useRef, useState } from "react";
import { useStore } from "stores/store";
import { ignoreApiError } from "config/api.config";
import { useUpdateWorldMutation } from "hooks/queries/useWorldsQuery";

export function WorldNameSection() {
  const worldName = useStore(
    (store) => store.worlds.currentWorld.currentWorld?.name ?? ""
  );
  const [tmpWorldName, setTmpWorldName] = useState(worldName);

  const [loading, setLoading] = useState(false);
  const worldId = useStore(
    (store) => store.worlds.currentWorld.currentWorldId
  );
  const updateWorld = useUpdateWorldMutation(worldId);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setLoading(true);
    updateWorld
      .mutateAsync({ name: tmpWorldName })
      .catch(ignoreApiError)
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    setTmpWorldName(worldName);
  }, [worldName]);

  return (
    <>
      <SectionHeading breakContainer label={"World Name"} />

      <TextField
        inputRef={inputRef}
        sx={{ mt: 2 }}
        label={"World Name"}
        value={tmpWorldName}
        onChange={(evt) => setTmpWorldName(evt.currentTarget.value)}
        onBlur={() => handleSave()}
        disabled={loading}
      />
    </>
  );
}
