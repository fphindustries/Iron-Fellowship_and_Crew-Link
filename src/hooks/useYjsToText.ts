import { useMemo } from "react";
import * as Y from "yjs";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { generateText } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

const NOTE_CHAR_LIMIT = 6000;

/**
 * Converts a Yjs-encoded Uint8Array (as stored in openNoteContent) to a
 * plain-text string suitable for AI context. Truncates at NOTE_CHAR_LIMIT chars.
 * Returns undefined when content is null/undefined.
 */
export function useYjsToText(
  content: Uint8Array | null | undefined
): string | undefined {
  return useMemo(() => {
    if (!content) return undefined;
    try {
      const doc = new Y.Doc();
      Y.applyUpdate(doc, content);
      const json = TiptapTransformer.fromYdoc(doc, "default");
      const text = generateText(json, [StarterKit]);
      doc.destroy();
      return text.length > NOTE_CHAR_LIMIT
        ? text.slice(0, NOTE_CHAR_LIMIT) + "…"
        : text;
    } catch {
      return undefined;
    }
  }, [content]);
}
