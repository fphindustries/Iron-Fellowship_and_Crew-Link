import { Box } from "@mui/material";
import { MarkdownRenderer } from "components/shared/MarkdownRenderer";
import { MarkdownEditor } from "components/shared/RichTextEditor/MarkdownEditor";
import { useState } from "react";
import { useUpdateHomebrewMutation } from "hooks/queries/useHomebrewQuery";

export interface DescriptionProps {
  expansionId: string;
  description?: string;
  isEditor?: boolean;
}

export function Description(props: DescriptionProps) {
  const { expansionId, description, isEditor } = props;
  const updateDetails = useUpdateHomebrewMutation(expansionId);

  const [localDescription, setLocalDescription] = useState(description ?? "");

  const handleSave = () => {
    updateDetails.mutateAsync({ description: localDescription });
  };

  return (
    <Box maxWidth={(theme) => theme.breakpoints.values.md}>
      {isEditor ? (
        <MarkdownEditor
          label={"Description"}
          content={localDescription ?? ""}
          onChange={(value) => setLocalDescription(value)}
          onBlur={handleSave}
        />
      ) : (
        <MarkdownRenderer markdown={description ?? ""} />
      )}
    </Box>
  );
}
