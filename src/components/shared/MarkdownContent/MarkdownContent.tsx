import { Box, SxProps, Theme } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownContentProps {
  children: string;
  sx?: SxProps<Theme>;
}

export function MarkdownContent({ children, sx }: MarkdownContentProps) {
  return (
    <Box
      sx={{
        fontSize: "0.875rem",
        lineHeight: 1.5,
        "& p": { mt: 0, mb: 0.75, "&:last-child": { mb: 0 } },
        "& ul, & ol": { mt: 0, mb: 0.75, pl: 2.5 },
        "& li": { mb: 0.25 },
        "& strong": { fontWeight: 600 },
        "& em": { fontStyle: "italic" },
        ...sx,
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </Box>
  );
}
