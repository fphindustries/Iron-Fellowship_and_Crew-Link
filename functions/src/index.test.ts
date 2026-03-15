import * as sinon from "sinon";
import { expect } from "chai";
import type * as FirebaseAdmin from "firebase-admin";
import type * as FirestoreTypes from "firebase-admin/firestore";
import type * as FunctionsModule from "./index";

// ─── Controlled module loading ───────────────────────────────────────────────
//
// Static `import` statements are hoisted to the top of the compiled CJS output,
// so we cannot use them to stub firebase-admin before index.ts is loaded.
// Instead we use `require()` at the top of the module body (which runs after all
// static imports), set up stubs, and *then* load index.ts via `require()`.
//
// eslint-disable-next-line @typescript-eslint/no-require-imports
const adminModule = require("firebase-admin") as typeof FirebaseAdmin;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const firestoreModule = require("firebase-admin/firestore") as typeof FirestoreTypes;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const loggerModule = require("firebase-functions/logger") as Record<
  string,
  sinon.SinonStub
>;

// Stub initializeApp so that loading index.ts (which calls it at module level)
// does not require a real Firebase project.
sinon.stub(adminModule, "initializeApp").returns({} as ReturnType<typeof adminModule.initializeApp>);

// Silence logger output during tests.
sinon.stub(loggerModule, "info");
sinon.stub(loggerModule, "warn");
sinon.stub(loggerModule, "error");

// Load the functions now that all prerequisite stubs are in place.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fns = require("./index") as typeof FunctionsModule;

// ─── Firestore mock helpers ──────────────────────────────────────────────────

interface DocRef {
  get: sinon.SinonStub;
  update: sinon.SinonStub;
}

interface CollRef {
  where: sinon.SinonStub;
  get: sinon.SinonStub;
  add: sinon.SinonStub;
}

interface FirestoreMock {
  doc: sinon.SinonStub;
  collection: sinon.SinonStub;
  docRefs: Map<string, DocRef>;
  collRefs: Map<string, CollRef>;
}

/**
 * Builds a minimal Firestore mock whose doc/collection behaviour can be
 * configured per path via the `docs` and `collections` options.
 */
function createFirestoreMock(config: {
  docs?: Record<string, Record<string, unknown> | null>;
  collections?: Record<
    string,
    Array<{ id: string; data: Record<string, unknown> }>
  >;
} = {}): FirestoreMock {
  const docRefs = new Map<string, DocRef>();
  const collRefs = new Map<string, CollRef>();

  const getDocRef = (path: string): DocRef => {
    if (!docRefs.has(path)) {
      const stored = config.docs?.[path] ?? null;
      docRefs.set(path, {
        get: sinon.stub().resolves({ data: () => stored }),
        update: sinon.stub().resolves(),
      });
    }
    return docRefs.get(path) as DocRef;
  };

  const getCollRef = (path: string): CollRef => {
    if (!collRefs.has(path)) {
      const stored = config.collections?.[path] ?? [];
      const ref: CollRef = {
        where: sinon.stub(),
        get: sinon
          .stub()
          .resolves({ docs: stored.map((d) => ({ id: d.id, data: () => d.data })) }),
        add: sinon.stub().resolves({ id: "generated-key" }),
      };
      // `where(...)` returns the same ref so the `.where(...).get()` chain works.
      ref.where.returns(ref);
      collRefs.set(path, ref);
    }
    return collRefs.get(path) as CollRef;
  };

  return {
    doc: sinon.stub().callsFake(getDocRef),
    collection: sinon.stub().callsFake(getCollRef),
    docRefs,
    collRefs,
  };
}

/** Build a CallableRequest-shaped object for the `.run()` call. */
function makeRequest<T>(data: T, uid?: string) {
  // Cast to `any` so the minimal `token: {}` stub satisfies DecodedIdToken.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    data,
    auth: uid ? { uid, token: {} } : undefined,
    rawRequest: {},
    app: undefined,
    instanceIdToken: undefined,
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Firebase Cloud Functions", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    loggerModule.info.reset();
    loggerModule.warn.reset();
    loggerModule.error.reset();
  });

  // ─── getHomebrewEditorInviteKey ────────────────────────────────────────────

  describe("getHomebrewEditorInviteKey", () => {
    const COLLECTION_ID = "col-abc";
    const USER_ID = "user-123";
    const COLLECTION_PATH = `/homebrew/homebrew/collections/${COLLECTION_ID}`;
    const INVITE_KEYS_PATH = "/homebrew/homebrew/editorInviteKeys";

    it("returns null when user is not authenticated", async () => {
      const mock = createFirestoreMock();
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.getHomebrewEditorInviteKey.run(
        makeRequest({ homebrewCollectionId: COLLECTION_ID })
      );

      expect(result).to.be.null;
      expect(loggerModule.warn.calledOnce).to.be.true;
    });

    it("returns null when the homebrew collection does not exist", async () => {
      const mock = createFirestoreMock({
        docs: { [COLLECTION_PATH]: null },
      });
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.getHomebrewEditorInviteKey.run(
        makeRequest({ homebrewCollectionId: COLLECTION_ID }, USER_ID)
      );

      expect(result).to.be.null;
      expect(loggerModule.warn.calledOnce).to.be.true;
    });

    it("returns null when user is not an editor of the collection", async () => {
      const mock = createFirestoreMock({
        docs: { [COLLECTION_PATH]: { editors: ["other-user"] } },
      });
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.getHomebrewEditorInviteKey.run(
        makeRequest({ homebrewCollectionId: COLLECTION_ID }, USER_ID)
      );

      expect(result).to.be.null;
      expect(loggerModule.warn.calledOnce).to.be.true;
    });

    it("returns an existing invite key when one already exists", async () => {
      const EXISTING_KEY = "existing-key-xyz";
      const mock = createFirestoreMock({
        docs: { [COLLECTION_PATH]: { editors: [USER_ID] } },
        collections: {
          [INVITE_KEYS_PATH]: [
            { id: EXISTING_KEY, data: { collectionId: COLLECTION_ID } },
          ],
        },
      });
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.getHomebrewEditorInviteKey.run(
        makeRequest({ homebrewCollectionId: COLLECTION_ID }, USER_ID)
      );

      expect(result).to.equal(EXISTING_KEY);
    });

    it("creates and returns a new invite key when none exist", async () => {
      const mock = createFirestoreMock({
        docs: { [COLLECTION_PATH]: { editors: [USER_ID] } },
        collections: { [INVITE_KEYS_PATH]: [] },
      });
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.getHomebrewEditorInviteKey.run(
        makeRequest({ homebrewCollectionId: COLLECTION_ID }, USER_ID)
      );

      expect(result).to.equal("generated-key");
      const collRef = mock.collRefs.get(INVITE_KEYS_PATH) as CollRef;
      expect(collRef.add.calledOnceWith({ collectionId: COLLECTION_ID })).to.be
        .true;
    });
  });

  // ─── getHomebrewIdFromInviteKey ────────────────────────────────────────────

  describe("getHomebrewIdFromInviteKey", () => {
    const INVITE_KEY = "invite-key-123";
    const COLLECTION_ID = "col-abc";
    const USER_ID = "user-123";
    const INVITE_KEY_PATH = `/homebrew/homebrew/editorInviteKeys/${INVITE_KEY}`;

    it("returns null when user is not authenticated", async () => {
      const mock = createFirestoreMock();
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.getHomebrewIdFromInviteKey.run(
        makeRequest({ inviteKey: INVITE_KEY })
      );

      expect(result).to.be.null;
      expect(loggerModule.warn.calledOnce).to.be.true;
    });

    it("returns null when the invite key document does not exist", async () => {
      const mock = createFirestoreMock({
        docs: { [INVITE_KEY_PATH]: null },
      });
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.getHomebrewIdFromInviteKey.run(
        makeRequest({ inviteKey: INVITE_KEY }, USER_ID)
      );

      expect(result).to.be.null;
      expect(loggerModule.error.calledOnce).to.be.true;
    });

    it("returns the collectionId for a valid invite key", async () => {
      const mock = createFirestoreMock({
        docs: { [INVITE_KEY_PATH]: { collectionId: COLLECTION_ID } },
      });
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.getHomebrewIdFromInviteKey.run(
        makeRequest({ inviteKey: INVITE_KEY }, USER_ID)
      );

      expect(result).to.equal(COLLECTION_ID);
    });
  });

  // ─── addCurrentUserAsHomebrewCampaignEditor ────────────────────────────────

  describe("addCurrentUserAsHomebrewCampaignEditor", () => {
    const INVITE_KEY = "invite-key-123";
    const COLLECTION_ID = "col-abc";
    const USER_ID = "user-123";
    const INVITE_KEY_PATH = `/homebrew/homebrew/editorInviteKeys/${INVITE_KEY}`;
    const COLLECTION_PATH = `/homebrew/homebrew/collections/${COLLECTION_ID}`;

    it("returns false when user is not authenticated", async () => {
      const mock = createFirestoreMock();
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.addCurrentUserAsHomebrewCampaignEditor.run(
        makeRequest({ inviteKey: INVITE_KEY, homebrewCollectionId: COLLECTION_ID })
      );

      expect(result).to.be.false;
    });

    it("returns false when the invite key does not resolve to a collection", async () => {
      const mock = createFirestoreMock({
        docs: { [INVITE_KEY_PATH]: null },
      });
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.addCurrentUserAsHomebrewCampaignEditor.run(
        makeRequest(
          { inviteKey: INVITE_KEY, homebrewCollectionId: COLLECTION_ID },
          USER_ID
        )
      );

      expect(result).to.be.false;
      expect(loggerModule.error.calledOnce).to.be.true;
    });

    it("returns false when the invite key collection ID does not match the request", async () => {
      const mock = createFirestoreMock({
        docs: { [INVITE_KEY_PATH]: { collectionId: "different-collection" } },
      });
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.addCurrentUserAsHomebrewCampaignEditor.run(
        makeRequest(
          { inviteKey: INVITE_KEY, homebrewCollectionId: COLLECTION_ID },
          USER_ID
        )
      );

      expect(result).to.be.false;
      expect(loggerModule.error.calledOnce).to.be.true;
    });

    it("adds the user as editor and returns true for a valid request", async () => {
      const mock = createFirestoreMock({
        docs: {
          [INVITE_KEY_PATH]: { collectionId: COLLECTION_ID },
          [COLLECTION_PATH]: { editors: [] },
        },
      });
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.addCurrentUserAsHomebrewCampaignEditor.run(
        makeRequest(
          { inviteKey: INVITE_KEY, homebrewCollectionId: COLLECTION_ID },
          USER_ID
        )
      );

      expect(result).to.be.true;
      const collectionDocRef = mock.docRefs.get(COLLECTION_PATH) as DocRef;
      expect(collectionDocRef.update.calledOnce).to.be.true;
    });
  });

  // ─── removeCurrentUserAsHomebrewCampaignEditor ────────────────────────────

  describe("removeCurrentUserAsHomebrewCampaignEditor", () => {
    const COLLECTION_ID = "col-abc";
    const USER_ID = "user-123";
    const COLLECTION_PATH = `/homebrew/homebrew/collections/${COLLECTION_ID}`;

    it("returns false when user is not authenticated", async () => {
      const mock = createFirestoreMock();
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.removeCurrentUserAsHomebrewCampaignEditor.run(
        makeRequest({ homebrewCollectionId: COLLECTION_ID })
      );

      expect(result).to.be.false;
    });

    it("removes the user as editor and returns true for a valid request", async () => {
      const mock = createFirestoreMock({
        docs: { [COLLECTION_PATH]: { editors: [USER_ID] } },
      });
      sandbox.stub(firestoreModule, "getFirestore").returns(mock as never);

      const result = await fns.removeCurrentUserAsHomebrewCampaignEditor.run(
        makeRequest({ homebrewCollectionId: COLLECTION_ID }, USER_ID)
      );

      expect(result).to.be.true;
      const collectionDocRef = mock.docRefs.get(COLLECTION_PATH) as DocRef;
      expect(collectionDocRef.update.calledOnce).to.be.true;
    });
  });
});
