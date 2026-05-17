import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { RtcEditorComponent } from "./RtcEditorComponent";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { useCreateRefFrom } from "hooks/useCreateRefFrom";
import { SocketIOProvider } from "lib/SocketIOProvider";

export interface RtcRichTextEditorProps {
  id: string;
  roomPrefix: string;
  documentPassword?: string;
  onSave?: (
    documentId: string,
    notes: Uint8Array,
    isBeaconRequest?: boolean,
    title?: string
  ) => Promise<boolean | void>;
  onDelete?: (id: string) => void;
  initialValue?: Uint8Array;
  showTitle?: boolean;
  extraEditorActions?: ReactNode;
}

export function RtcRichTextEditor(props: RtcRichTextEditorProps) {
  const {
    id,
    roomPrefix,
    onSave,
    onDelete,
    initialValue,
    showTitle,
    extraEditorActions,
  } = props;
  const initialValueRef = useCreateRefFrom(initialValue);

  const [yDoc, setYDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<SocketIOProvider>();

  const hasUnsavedChangesRef = useRef<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);

  const handleSave = useCallback(
    (idToPass: string, doc: Y.Doc, isBeaconRequest?: boolean) => {
      if (onSave) {
        const notes = Y.encodeStateAsUpdate(doc);
        const title = showTitle ? extractTitle(doc) : undefined;
        setHasUnsavedChanges(false);
        hasUnsavedChangesRef.current = false;
        setSaving(true);
        onSave(idToPass, notes, isBeaconRequest, title)
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            setSaving(false);
          });
      }
    },
    [showTitle, onSave]
  );

  useEffect(() => {
    const roomName = roomPrefix + id;
    const newYDoc = new Y.Doc();
    if (initialValueRef.current) {
      Y.applyUpdate(newYDoc, initialValueRef.current);
    }

    newYDoc?.on("update", (_message, origin) => {
      // Only on changes we make, to prevent overcrowding our backend
      if (!origin || origin.constructor?.name !== "SocketIOProvider") {
        setHasUnsavedChanges(true);
        hasUnsavedChangesRef.current = true;
      }
    });

    const newProvider = new SocketIOProvider(roomName, newYDoc);

    setProvider(newProvider);
    setYDoc(newYDoc);
    setHasUnsavedChanges(false);
    setSaving(false);
    hasUnsavedChangesRef.current = false;

    return () => {
      if (hasUnsavedChangesRef.current && newYDoc) {
        handleSave(id, newYDoc);
      }
      try {
        newYDoc?.destroy();
        newProvider?.destroy();
      } catch (e) {
        // Suppress error
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomPrefix, id, handleSave]);

  // Handle save on page unload
  useEffect(() => {
    const onUnloadFunction = () => {
      if (
        document.visibilityState === "hidden" &&
        hasUnsavedChangesRef.current &&
        yDoc
      ) {
        handleSave(id, yDoc, true);
      }
    };
    document.addEventListener("visibilitychange", onUnloadFunction);

    return () => {
      document.removeEventListener("visibilitychange", onUnloadFunction);
    };
  }, [handleSave, yDoc, id]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (yDoc && hasUnsavedChanges) {
      timeout = setTimeout(() => {
        handleSave(id, yDoc);
      }, 30 * 1000);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [yDoc, hasUnsavedChanges, handleSave, id]);

  useEffect(() => {
    if (!hasUnsavedChangesRef.current && yDoc && initialValue) {
      Y.applyUpdate(yDoc, initialValue, { peerId: "local" });
    }
  }, [initialValue, yDoc, showTitle]);

  if (!yDoc || !provider) {
    return null;
  }

  return (
    <RtcEditorComponent
      readOnly={!onSave}
      provider={provider}
      doc={yDoc}
      saving={saving}
      deleteNote={onDelete ? () => onDelete(id) : undefined}
      withHeading={showTitle}
      extraEditorActions={extraEditorActions}
    />
  );
}

function extractTitle(doc: Y.Doc): string | undefined {
  const jsonContent = TiptapTransformer.fromYdoc(doc, "default");
  let currentNode = jsonContent.content?.[0];
  while (currentNode && !currentNode.text) {
    currentNode = currentNode.content?.[0];
  }
  return currentNode?.text ?? "Placeholder Title";
}
