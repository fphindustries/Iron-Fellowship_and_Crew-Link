import { firestore } from "config/firebase.config";
import {
  CollectionReference,
  DocumentReference,
  Timestamp,
  collection,
  doc,
} from "firebase/firestore";
import {
  SessionDocument,
  SessionLogEvent,
} from "types/SessionLog.type";
import {
  SessionDocumentDB,
  SessionEventDocumentDB,
} from "./_session-log.type";

// --- Character session paths ---

export function constructCharacterSessionsCollectionPath(
  characterId: string
) {
  return `/characters/${characterId}/sessions`;
}

export function constructCharacterSessionDocPath(
  characterId: string,
  sessionId: string
) {
  return `/characters/${characterId}/sessions/${sessionId}`;
}

export function getCharacterSessionsCollection(characterId: string) {
  return collection(
    firestore,
    constructCharacterSessionsCollectionPath(characterId)
  ) as CollectionReference<SessionDocumentDB>;
}

export function getCharacterSessionDoc(
  characterId: string,
  sessionId: string
) {
  return doc(
    firestore,
    constructCharacterSessionDocPath(characterId, sessionId)
  ) as DocumentReference<SessionDocumentDB>;
}

// --- Campaign session paths ---

export function constructCampaignSessionsCollectionPath(
  campaignId: string
) {
  return `/campaigns/${campaignId}/sessions`;
}

export function constructCampaignSessionDocPath(
  campaignId: string,
  sessionId: string
) {
  return `/campaigns/${campaignId}/sessions/${sessionId}`;
}

export function getCampaignSessionsCollection(campaignId: string) {
  return collection(
    firestore,
    constructCampaignSessionsCollectionPath(campaignId)
  ) as CollectionReference<SessionDocumentDB>;
}

export function getCampaignSessionDoc(
  campaignId: string,
  sessionId: string
) {
  return doc(
    firestore,
    constructCampaignSessionDocPath(campaignId, sessionId)
  ) as DocumentReference<SessionDocumentDB>;
}

// --- Session events paths ---

export function getSessionEventsCollection(
  parentCollectionPath: string,
  sessionId: string
) {
  return collection(
    firestore,
    `${parentCollectionPath}/${sessionId}/events`
  ) as CollectionReference<SessionEventDocumentDB>;
}

export function getSessionEventDoc(
  parentCollectionPath: string,
  sessionId: string,
  eventId: string
) {
  return doc(
    firestore,
    `${parentCollectionPath}/${sessionId}/events/${eventId}`
  ) as DocumentReference<SessionEventDocumentDB>;
}

// --- Converters ---

export function convertSessionFromDatabase(
  dbDoc: SessionDocumentDB
): SessionDocument {
  return {
    ...dbDoc,
    startedAt: dbDoc.startedAt.toDate(),
    endedAt: dbDoc.endedAt?.toDate(),
  };
}

export function convertSessionToDatabase(
  session: SessionDocument
): SessionDocumentDB {
  return {
    ...session,
    startedAt: Timestamp.fromDate(session.startedAt),
    endedAt: session.endedAt
      ? Timestamp.fromDate(session.endedAt)
      : undefined,
  };
}

export function convertEventFromDatabase(
  dbDoc: SessionEventDocumentDB
): SessionLogEvent {
  return {
    ...dbDoc,
    timestamp: dbDoc.timestamp.toDate(),
  } as SessionLogEvent;
}

export function convertEventToDatabase(
  event: SessionLogEvent
): SessionEventDocumentDB {
  return {
    ...event,
    timestamp: Timestamp.fromDate(event.timestamp),
  } as SessionEventDocumentDB;
}
