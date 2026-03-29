import { Timestamp } from "firebase/firestore";
import { SessionDocument, SessionLogEvent } from "types/SessionLog.type";

export type SessionDocumentDB = Omit<SessionDocument, "startedAt" | "endedAt"> & {
  startedAt: Timestamp;
  endedAt?: Timestamp;
};

export type SessionEventDocumentDB = Omit<SessionLogEvent, "timestamp"> & {
  timestamp: Timestamp;
};
