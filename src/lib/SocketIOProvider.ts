import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate } from "y-protocols/awareness.js";
import { io, Socket } from "socket.io-client";
import { SOCKET_NAMESPACES } from "../config/api.config";

let yjsSocket: Socket | null = null;

function getYjsSocket(): Socket {
  if (!yjsSocket) {
    yjsSocket = io(SOCKET_NAMESPACES.yjs, {
      withCredentials: true,
      autoConnect: true,
    });
  }
  return yjsSocket;
}

export class SocketIOProvider {
  readonly awareness: Awareness;
  private socket: Socket;
  private entityType: string;
  private entityId: string;
  private doc: Y.Doc;
  private synced = false;

  constructor(room: string, doc: Y.Doc) {
    this.doc = doc;
    this.socket = getYjsSocket();

    // Parse room into entityType + entityId.
    // Room format: "<prefix>/<id>" e.g. "character-notes/abc-123"
    const slashIdx = room.lastIndexOf("/");
    if (slashIdx !== -1) {
      this.entityType = room.slice(0, slashIdx);
      this.entityId = room.slice(slashIdx + 1);
    } else {
      this.entityType = "note";
      this.entityId = room;
    }

    this.awareness = new Awareness(doc);

    this.socket.emit("join-document", {
      entityType: this.entityType,
      entityId: this.entityId,
    });

    const stateVector = Y.encodeStateVector(doc);
    this.socket.emit("sync-step-1", {
      entityType: this.entityType,
      entityId: this.entityId,
      stateVector: Array.from(stateVector),
    });

    this.socket.on("sync-step-2", ({ diff }: { diff: number[] }) => {
      Y.applyUpdateV2(this.doc, new Uint8Array(diff), this);
      this.synced = true;
    });

    this.socket.on("update", ({ update }: { update: number[] }) => {
      Y.applyUpdateV2(this.doc, new Uint8Array(update), this);
    });

    this.socket.on(
      "awareness-update",
      ({ update }: { update: number[] }) => {
        applyAwarenessUpdate(this.awareness, new Uint8Array(update), this);
      }
    );

    doc.on("updateV2", this.onDocUpdate);

    this.awareness.on("update", this.onAwarenessUpdate);
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return;
    this.socket.emit("update", {
      entityType: this.entityType,
      entityId: this.entityId,
      update: Array.from(update),
    });
  };

  private onAwarenessUpdate = ({
    added,
    updated,
    removed,
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    const changedClients = [...added, ...updated, ...removed];
    const update = (this.awareness as any).encodeUpdate?.(changedClients);
    if (!update) return;
    this.socket.emit("awareness-update", {
      entityType: this.entityType,
      entityId: this.entityId,
      update: Array.from(update),
    });
  };

  destroy() {
    this.doc.off("updateV2", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    this.socket.off("sync-step-2");
    this.socket.off("update");
    this.socket.off("awareness-update");
    this.awareness.destroy();
  }
}
