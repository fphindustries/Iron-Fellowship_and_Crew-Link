# Firebase → Supabase Migration Map

Generated from codebase analysis. Documents every Firebase touchpoint.

---

## AUTH

### Methods (`src/lib/auth.lib.ts`)

| Method | Firebase Call | Line |
|--------|--------------|------|
| `loginWithGoogle()` | `signInWithPopup(firebaseAuth, googleAuthProvider)` | 23 |
| `loginWithToken(token)` | `signInWithCustomToken(firebaseAuth, token)` | 36 |
| `sendMagicEmailLink(email, name)` | `sendSignInLinkToEmail(firebaseAuth, email, actionCodeSettings)` | 57 |
| `completeMagicLinkSignupIfPresent()` | `isSignInWithEmailLink(firebaseAuth, ...)` + `signInWithEmailLink(...)` | 74, 88 |
| `logout()` | `signOut(firebaseAuth)` | 118 |
| `getUser()` | `onAuthStateChanged(firebaseAuth, ...)` | 123 |
| `updateUser(userDoc)` | `firebaseAuth.currentUser` + `updateProfile(user, ...)` | 140, 145 |

### Auth State (`src/stores/auth/auth.slice.ts`)

| Usage | Location | Line |
|-------|----------|------|
| `onAuthStateChanged(firebaseAuth, ...)` | subscribe() | 17 |
| `user.displayName` | subscribe callback | 26 |
| `user.photoURL` | subscribe callback | 29 |
| `user.uid` → `state.auth.uid` | subscribe callback | 40 |

### Auth User Object Fields Used

| Field | Supabase Equivalent |
|-------|---------------------|
| `user.uid` | `user.id` |
| `user.displayName` | `user.user_metadata.full_name` or `users` table |
| `user.photoURL` | `user.user_metadata.avatar_url` or `users` table |
| `user.getIdToken()` | `session.access_token` (in `src/api-calls/ai/streamNarrative.ts:20`) |
| `firebaseAuth.currentUser` | `supabase.auth.getUser()` or cached session |

---

## FIREBASE CONFIGURATION

| File | Purpose |
|------|---------|
| `src/config/firebase.config.ts` | Dual-project init (Ironsworn + Starforged), exports `firebaseAuth`, `firestore`, `storage`, `functions`, `projectId` |
| `firebase.json` | Firebase service configuration |
| `.firebaserc` | Project aliases |
| `firestore.rules` | Security rules |
| `firestore.indexes.json` | Composite indexes |
| `storage.rules` | Storage security rules |

### Environment Variables (12 total)

```
VITE_IRON_FELLOWSHIP_FIREBASE_APIKEY
VITE_IRON_FELLOWSHIP_FIREBASE_AUTHDOMAIN
VITE_IRON_FELLOWSHIP_FIREBASE_PROJECTID
VITE_IRON_FELLOWSHIP_FIREBASE_STORAGEBUCKET
VITE_IRON_FELLOWSHIP_FIREBASE_MESSAGINGSENDERID
VITE_IRON_FELLOWSHIP_FIREBASE_APPID
VITE_CREW_LINK_FIREBASE_APIKEY
VITE_CREW_LINK_FIREBASE_AUTHDOMAIN
VITE_CREW_LINK_FIREBASE_PROJECTID
VITE_CREW_LINK_FIREBASE_STORAGEBUCKET
VITE_CREW_LINK_FIREBASE_MESSAGINGSENDERID
VITE_CREW_LINK_FIREBASE_APPID
```

---

## FIRESTORE READS

### One-Time Reads (getDoc / getDocs)

| File | Collection Path | Type |
|------|----------------|------|
| `src/api-calls/campaign/getCampaign.ts` | `/campaigns/{campaignId}` | getDoc |
| `src/api-calls/user/getUserDoc.ts` | `/users/{uid}` | getDoc |
| `src/api-calls/session-log/getMostRecentSession.ts` | `/campaigns/{id}/sessions` or `/characters/{id}/sessions` (where isActive==false, orderBy startedAt desc, limit 1) | getDocs |
| `src/api-calls/game-log/deleteAllLogs.ts` | `/campaigns/{id}/game-log` or `/characters/{id}/game-log` | getDocs |
| `src/api-calls/world/deleteWorld.ts` | `/campaigns` + `/characters` (where worldId==...) | getDocs |

### Realtime Subscriptions (onSnapshot) — 28 hooks

| Listener Function | File | Collection Path | Query |
|------------------|------|----------------|-------|
| `listenToCharacter` | `src/api-calls/character/listenToCharacter.ts` | `/characters/{id}` | Single doc |
| `listenToUsersCharacters` | `src/api-calls/character/listenToUsersCharacters.ts` | `/characters` | where uid==uid |
| `listenToUsersCampaigns` | `src/api-calls/campaign/listenToUsersCampaigns.ts` | `/campaigns` | where users array-contains uid |
| `listenToCampaignCharacters` | `src/api-calls/campaign/listenToCampaignCharacters.ts` | `/characters/{id}` (multiple) | Multiple doc listeners |
| `listenToWorld` | `src/api-calls/world/listenToWorld.ts` | `/worlds/{id}` | Single doc |
| `listenToUsersWorlds` | `src/api-calls/world/listenToUsersWorlds.ts` | `/worlds` | or(ownerIds array-contains, campaignGuides array-contains) |
| `listenToLocations` | `src/api-calls/world/locations/listenToLocations.ts` | `/worlds/{id}/locations` | Optional: where sharedWithPlayers==true |
| `listenToNPCs` | `src/api-calls/world/npcs/listenToNPCs.ts` | `/worlds/{id}/npcs` | Optional: where sharedWithPlayers==true |
| `listenToLoreDocuments` | `src/api-calls/world/lore/listenToLoreDocuments.ts` | `/worlds/{id}/lore` | Optional: where sharedWithPlayers==true |
| `listenToSectors` | `src/api-calls/world/sectors/listenToSectors.ts` | `/worlds/{id}/sectors` | Optional: where sharedWithPlayers==true |
| `listenToLogs` | `src/api-calls/game-log/listenToLogs.ts` | `/campaigns/{id}/game-log` or `/characters/{id}/game-log` | limit, orderBy timestamp desc, optional where gmsOnly==false |
| `listenToMostRecentCharacterLog` | `src/api-calls/game-log/listenToMostRecentCharacterLog.ts` | `/characters/{id}/game-log` | where timestamp > now, where characterId==id, orderBy timestamp desc, limit 1 |
| `listenToAssets` | `src/api-calls/assets/listenToAssets.ts` | `/characters/{id}/assets` or `/campaigns/{id}/assets` | Full collection |
| `listenToProgressTracks` | `src/api-calls/tracks/listenToProgressTracks.ts` | `/campaigns/{id}/tracks` or `/characters/{id}/tracks` | where status==status |
| `listenToNotes` | `src/api-calls/notes/listenToNotes.ts` | `/characters/{id}/notes` or `/campaigns/{id}/notes` | Optional: where shared==true |
| `listenToSettings` | `src/api-calls/character-campaign-settings/listenToSettings.ts` | `/campaigns/{id}/settings/settings` or `/characters/{id}/settings/settings` | Single doc |
| `listenToCustomOracles` | `src/api-calls/user/custom-oracles/listenToCustomOracles.ts` | `/users/{uid}/custom-oracles/custom-oracles` | Single doc |
| `listenToCustomMoves` | `src/api-calls/user/custom-moves/listenToCustomMoves.ts` | `/users/{uid}/custom-moves/custom-moves` | Single doc |
| `listenToUserDoc` | `src/api-calls/user/listenToUserDoc.ts` | `/users/{uid}` | Single doc |
| `listenToAccessibilitySettings` | `src/api-calls/user/settings/listenToAccessibilitySettings.ts` | `/users/{uid}/settings/accessibility` | Single doc |
| `listenToAiEvents` | `src/api-calls/ai/listenToAiEvents.ts` | `/campaigns/{id}/ai-events` | orderBy createdAt desc, limit 50 |
| `listenToActiveSession` | `src/api-calls/session-log/listenToActiveSession.ts` | `/campaigns/{id}/sessions` or `/characters/{id}/sessions` | where isActive==true, orderBy startedAt desc, limit 1 |
| `listenToActiveCombat` | `src/api-calls/combat/listenToActiveCombat.ts` | `/campaigns/{id}/combats` or `/characters/{id}/combats` | where active==true, limit 1 |
| `listenToHomebrewCollections` | `src/api-calls/homebrew/listenToHomebrewCollections.ts` | `/homebrew/homebrew/collections` | or(editors array-contains, viewers array-contains) |
| `listenToHomebrewCollection` | `src/api-calls/homebrew/listenToHomebrewCollection.ts` | `/homebrew/homebrew/collections/{id}` | Single doc |
| `listenToWorld` (current) | `src/api-calls/world/listenToWorld.ts` | `/worlds/{id}` | Single doc |
| `listenToUsersWorlds` | `src/api-calls/world/listenToUsersWorlds.ts` | `/worlds` | array-contains queries |
| `listenToOracleSettings` | `src/api-calls/user/settings/listenToOracleSettings.ts` | `/users/{uid}/settings/oracle` | Single doc |

---

## FIRESTORE WRITES

### Creates (addDoc)

| File | Collection Path |
|------|----------------|
| `src/api-calls/campaign/createCampaign.ts` | `/campaigns` |
| `src/api-calls/character/createCharacter.ts` | `/characters` |
| `src/api-calls/assets/addAsset.ts` | `/characters/{id}/assets` or `/campaigns/{id}/assets` |
| `src/api-calls/game-log/addRoll.ts` | `/characters/{id}/game-log` or `/campaigns/{id}/game-log` |
| `src/api-calls/tracks/addProgressTrack.ts` | `/characters/{id}/tracks` or `/campaigns/{id}/tracks` |
| `src/api-calls/notes/addNote.ts` | `/characters/{id}/notes` or `/campaigns/{id}/notes` |
| `src/api-calls/world/createWorld.ts` | `/worlds` |
| `src/api-calls/world/locations/createLocation.ts` | `/worlds/{id}/locations` |
| `src/api-calls/world/npcs/createNPC.ts` | `/worlds/{id}/npcs` |
| `src/api-calls/world/lore/createLore.ts` | `/worlds/{id}/lore` |
| `src/api-calls/world/sectors/createSector.ts` | `/worlds/{id}/sectors` |
| `src/api-calls/homebrew/createHomebrewExpansion.ts` | `/homebrew/homebrew/collections` |
| `src/api-calls/session-log/startSession.ts` | `/campaigns/{id}/sessions` or `/characters/{id}/sessions` |
| `src/api-calls/session-log/addSessionEvent.ts` | `/campaigns/{id}/sessions/{id}/events` or `/characters/{id}/sessions/{id}/events` |
| `src/api-calls/combat/createCombat.ts` | `/campaigns/{id}/combats` or `/characters/{id}/combats` |

### Updates (updateDoc / setDoc)

| File | Document Path |
|------|--------------|
| `src/api-calls/character/updateCharacter.ts` | `/characters/{id}` |
| `src/api-calls/campaign/updateCampaign.ts` | `/campaigns/{id}` |
| `src/api-calls/assets/updateAsset.ts` | `/characters/{id}/assets/{id}` or `/campaigns/{id}/assets/{id}` |
| `src/api-calls/tracks/updateProgressTrack.ts` | `/characters/{id}/tracks/{id}` or `/campaigns/{id}/tracks/{id}` |
| `src/api-calls/notes/updateNote.ts` | `/characters/{id}/notes/{id}` or `/campaigns/{id}/notes/{id}` |
| `src/api-calls/notes/updateNoteOrder.ts` | `/characters/{id}/notes/{id}` or `/campaigns/{id}/notes/{id}` |
| `src/api-calls/world/updateWorld.ts` | `/worlds/{id}` |
| `src/api-calls/world/locations/updateLocation.ts` | `/worlds/{id}/locations/{id}` |
| `src/api-calls/world/npcs/updateNPC.ts` | `/worlds/{id}/npcs/{id}` |
| `src/api-calls/world/lore/updateLore.ts` | `/worlds/{id}/lore/{id}` |
| `src/api-calls/world/sectors/updateSector.ts` | `/worlds/{id}/sectors/{id}` |
| `src/api-calls/world/settings/updateWorldAiSettings.ts` | `/worlds/{id}/settings/ai-prompts` |
| `src/api-calls/user/updateUserDoc.ts` | `/users/{uid}` |
| `src/api-calls/user/updateUserDocNestedFields.ts` | `/users/{uid}` |
| `src/api-calls/ai/updateAiEventStatus.ts` | `/campaigns/{id}/ai-events/{id}` |
| `src/api-calls/combat/updateCombat.ts` | `/campaigns/{id}/combats/{id}` or `/characters/{id}/combats/{id}` |
| `src/api-calls/session-log/endSession.ts` | `/campaigns/{id}/sessions/{id}` or `/characters/{id}/sessions/{id}` |

### Deletes (deleteDoc)

| File | Document Path |
|------|--------------|
| `src/api-calls/character/deleteCharacter.ts` | `/characters/{id}` + `/characters/{id}/settings/settings` |
| `src/api-calls/campaign/deleteCampaign.ts` | `/campaigns/{id}` + `/campaigns/{id}/settings/settings` |
| `src/api-calls/world/deleteWorld.ts` | `/worlds/{id}` (+ runTransaction to update campaigns/characters) |
| `src/api-calls/world/locations/deleteLocation.ts` | `/worlds/{id}/locations/{id}` |
| `src/api-calls/world/npcs/deleteNPC.ts` | `/worlds/{id}/npcs/{id}` |
| `src/api-calls/world/lore/deleteLore.ts` | `/worlds/{id}/lore/{id}` |
| `src/api-calls/world/sectors/deleteSector.ts` | `/worlds/{id}/sectors/{id}` |
| `src/api-calls/assets/removeAsset.ts` | `/characters/{id}/assets/{id}` or `/campaigns/{id}/assets/{id}` |
| `src/api-calls/assets/deleteAllAssets.ts` | All assets (batch) |
| `src/api-calls/tracks/removeProgressTrack.ts` | `/characters/{id}/tracks/{id}` or `/campaigns/{id}/tracks/{id}` |
| `src/api-calls/notes/removeNote.ts` | `/characters/{id}/notes/{id}` or `/campaigns/{id}/notes/{id}` |
| `src/api-calls/game-log/removeLog.ts` | `/characters/{id}/game-log/{id}` or `/campaigns/{id}/game-log/{id}` |
| `src/api-calls/session-log/deleteSessionEvent.ts` | `.../sessions/{id}/events/{id}` |
| `src/api-calls/session-log/deleteSession.ts` | `.../sessions/{id}` |

### Batch / Transaction

| File | Operation |
|------|-----------|
| `src/api-calls/user/custom-moves/updateCustomMove.ts` | writeBatch: update moves map when moveId changes, manage moveOrder |
| `src/api-calls/user/custom-oracles/updateCustomOracle.ts` | writeBatch: same pattern for oracles |
| `src/api-calls/world/deleteWorld.ts` | runTransaction: update all campaigns + characters that reference worldId |
| `src/api-calls/assets/deleteAllAssets.ts` | writeBatch: delete all assets in collection |
| `src/api-calls/game-log/deleteAllLogs.ts` | writeBatch: delete all logs |
| `src/api-calls/tracks/deleteAllProgressTracks.ts` | writeBatch: delete all tracks |

### Special Firestore Field Operations

| Operation | Usage |
|-----------|-------|
| `arrayUnion()` | Adding users to campaigns, editors to homebrew collections |
| `arrayRemove()` | Removing users/editors |
| `deleteField()` | Removing `campaignId`/`worldId` from characters |
| `serverTimestamp()` | Timestamps on game-log, ai-events, sessions, combats |
| `FieldValue.increment()` | Potentially in rate limiting |

---

## FIRESTORE RULES SUMMARY

| Collection | Read | Write | Notes |
|-----------|------|-------|-------|
| `/characters/{id}` | Public | Owner (uid match) | Update restricted: anyone can change campaignId, worldId, initiativeStatus |
| `/characters/{id}/**` | Public | Owner | Tracks: any auth can update |
| `/campaigns/{id}/**` | Auth | Auth | Very permissive — any authenticated user |
| `/campaigns/{id}/ai-events/{id}` | Auth | Denied (create/delete) | Update restricted to status, response fields only |
| `/worlds/{id}` | Public | Owner (in ownerIds) | Update restricted: only ownerIds/campaignGuides |
| `/worlds/{id}/settings/**` | Auth | Owner/Guide | |
| `/worlds/{id}/locations/**` | Public | Any (public parts) | Private notes: owner/guide only |
| `/worlds/{id}/npcs/**` | Public | Any | Private notes: owner/guide only |
| `/worlds/{id}/lore/**` | Public | Any | Private notes: owner/guide only |
| `/worlds/{id}/sectors/**` | Auth | Auth (create/update), owner (delete) | Private notes: owner/guide only |
| `/homebrew/homebrew/collections/{id}` | Public | Editors | Creator can delete; viewers array can be updated by any auth |
| `/homebrew/homebrew/**` (sub-tables) | Public | Editors (via collection lookup) | |
| `/homebrew/homebrew/editorInviteKeys/**` | Denied | Denied | Server-side only |
| `/users/{id}` | Public | Owner only | |
| `/users/{id}/settings/**` | Owner | Owner | |
| `/users/{id}/ai-rate-limit/**` | Owner (read only) | Denied | Server-side writes only |

---

## CLOUD FUNCTIONS

### All Functions (`functions/src/`)

| Function Export | Trigger | File | Dependencies |
|----------------|---------|------|-------------|
| `callAiGuide` | onCall HTTPS | `functions/src/ai/aiCopilot.ts` | Firestore (read world settings, write ai-events), Anthropic API, OpenAI API |
| `generateNarrative` | onCall HTTPS (streaming) | `functions/src/aiGuide.ts` | Anthropic API (Claude Haiku), prompt caching |
| `recommendCharacterPaths` | onCall HTTPS | `functions/src/ai/recommendCharacterPaths.ts` | Anthropic/OpenAI |
| `generateCharacterBackstory` | onCall HTTPS | `functions/src/ai/generateCharacterBackstory.ts` | Anthropic/OpenAI |
| `generateCharacterVow` | onCall HTTPS | `functions/src/ai/generateCharacterVow.ts` | Anthropic/OpenAI |
| `recommendFinalAsset` | onCall HTTPS | `functions/src/ai/recommendFinalAsset.ts` | Anthropic/OpenAI |
| `recommendStatAllocation` | onCall HTTPS | `functions/src/ai/recommendStatAllocation.ts` | Anthropic/OpenAI |
| `randomizeCharacterAppearance` | onCall HTTPS | `functions/src/ai/randomizeCharacterAppearance.ts` | Anthropic/OpenAI |
| `generateCharacterPortraits` | onCall HTTPS | `functions/src/ai/generateCharacterPortraits.ts` | OpenAI image (DALL-E) only |
| `generateCharacterSummary` | onCall HTTPS | `functions/src/ai/generateCharacterSummary.ts` | Anthropic/OpenAI |
| `generateWorldDescription` | onCall HTTPS | `functions/src/ai/generateWorldDescription.ts` | Anthropic/OpenAI |
| `generateSectorContent` | onCall HTTPS | `functions/src/ai/generateSectorContent.ts` | Anthropic/OpenAI |
| `getHomebrewEditorInviteKey` | onCall HTTPS | `functions/src/index.ts:38` | Firestore |
| `getHomebrewIdFromInviteKey` | onCall HTTPS | `functions/src/index.ts:92` | Firestore |
| `addCurrentUserAsHomebrewCampaignEditor` | onCall HTTPS | `functions/src/index.ts:118` | Firestore, Auth |
| `removeCurrentUserAsHomebrewCampaignEditor` | onCall HTTPS | `functions/src/index.ts:156` | Firestore, Auth |

### Client-Side Callable Invocations

| File | Function Called |
|------|----------------|
| `src/api-calls/ai/callAiCopilot.ts` | `callAiGuide` |
| `src/api-calls/ai/streamNarrative.ts` | `generateNarrative` (via direct fetch + SSE) |
| `src/api-calls/homebrew/editorFunction/getEditorInviteUrl.ts` | `getHomebrewEditorInviteKey` |
| `src/api-calls/homebrew/editorFunction/acceptEditorInvite.ts` | `addCurrentUserAsHomebrewCampaignEditor` |
| `src/api-calls/homebrew/editorFunction/removeSelfAsEditor.ts` | `removeCurrentUserAsHomebrewCampaignEditor` |
| `src/api-calls/homebrew/editorFunction/getHomebrewCollectionFromInviteUrl.ts` | `getHomebrewIdFromInviteKey` |
| Other AI files in `src/api-calls/ai/` | Their respective functions |

### Key Function Notes

- `generateNarrative` uses **streaming SSE** via `response.sendChunk()` — Firebase v2 only feature
- `generateNarrative` uses **Anthropic prompt caching** on ROLE_BLOCK + gameContextBlock (ephemeral cache_control)
- `callAiGuide` reads `/worlds/{id}/settings/ai-prompts` from Firestore, writes to `/campaigns/{id}/ai-events`
- All AI functions use a **provider factory** pattern (`functions/src/ai/providerFactory.ts`) supporting both Anthropic and OpenAI

---

## FIREBASE STORAGE

### Storage Library (`src/lib/storage.lib.ts`)

| Function | Operation | Firebase SDK |
|----------|-----------|-------------|
| `uploadImage(path, image)` | Upload file | `ref()` + `uploadBytes()` |
| `deleteImage(path, filename)` | Delete file | `ref()` + `deleteObject()` |
| `getImageUrl(path)` | Get download URL | `ref()` + `getDownloadURL()` |
| `replaceImage(folderPath, oldFilename, newImage)` | Delete old + upload new | Composite (MAX 2MB) |

### Storage Upload Endpoints

| File | Storage Path | Purpose |
|------|-------------|---------|
| `src/api-calls/character/updateCharacterPortrait.ts` | `/characters/{uid}/characters/{charId}/` | Character portraits |
| `src/api-calls/world/locations/uploadLocationImage.ts` | `/worlds/{worldId}/locations/{locationId}/` | Location images |
| `src/api-calls/world/locations/uploadLocationMapBackgroundImage.ts` | `/worlds/{worldId}/locations/{locationId}/` | Map backgrounds |
| `src/api-calls/world/npcs/uploadNPCImage.ts` | `/worlds/{worldId}/npcs/{npcId}/` | NPC images |
| `src/api-calls/world/lore/uploadLoreImage.ts` | `/worlds/{worldId}/lore/{loreId}/` | Lore images |

### Storage Rules Summary

| Path | Read | Write | Max Size |
|------|------|-------|----------|
| `/characters/{userId}/characters/{charId}/**` | Public | Owner only | 5 MB, images only |
| `/worlds/{worldId}/locations/{locId}/**` | Auth | Auth | 5 MB, images only |
| `/worlds/{worldId}/npcs/{npcId}/**` | Auth | Auth | 5 MB, images only |
| `/worlds/{worldId}/lore/{loreId}/**` | Auth | Auth | 5 MB, images only |

---

## FIRESTORE COLLECTIONS — COMPLETE MAP

```
/characters/{characterId}           CharacterDocument
  /assets/{assetId}                 AssetDocument
  /game-log/{logId}                 GameLogDocument (= Roll)
  /notes/{noteId}                   NoteDocument
    /content/content                NoteContentDocument (Bytes = Tiptap/Yjs)
  /settings/settings                SettingsDocument
  /tracks/{trackId}                 TrackDocument (ProgressTrack | Clock | SceneChallenge)
  /sessions/{sessionId}             SessionDocument
    /events/{eventId}               SessionLogEvent (7-variant union)
  /combats/{combatId}               CombatDocument

/campaigns/{campaignId}             CampaignDocument
  /assets/{assetId}                 AssetDocument
  /game-log/{logId}                 GameLogDocument
  /notes/{noteId}                   NoteDocument
    /content/content                NoteContentDocument
  /settings/settings                SettingsDocument
  /tracks/{trackId}                 TrackDocument
  /sessions/{sessionId}             SessionDocument
    /events/{eventId}               SessionLogEvent
  /combats/{combatId}               CombatDocument
  /ai-events/{eventId}              AiEventDocument

/worlds/{worldId}                   WorldDocument
  /locations/{locationId}           LocationDocument
    /public/notes                   LocationNotesDocument (Bytes)
    /private/details                GMLocationDocument
  /lore/{loreId}                    LoreDocument
    /public/notes                   LoreNotesDocument (Bytes)
    /private/details                GMLoreDocument
  /npcs/{npcId}                     NPCDocument
    /public/notes                   NPCNotesDocument (Bytes)
    /private/details                GMNPCDocument
  /sectors/{sectorId}               SectorDocument
    /public/notes                   NoteContentDocument (Bytes)
    /private/notes                  NoteContentDocument (Bytes)
    /locations/{sectorLocId}        SectorLocationDocument
      /public/notes                 NoteContentDocument (Bytes)
      /private/notes                NoteContentDocument (Bytes)
  /settings/ai-prompts              WorldAiSettings

/homebrew/homebrew/
  /collections/{id}                 HomebrewCollectionDocument
  /stats/{id}                       HomebrewStatDocument
  /condition_meters/{id}            HomebrewConditionMeterDocument
  /non_linear_meters/{id}           HomebrewNonLinearMeterDocument
  /impacts/{id}                     HomebrewImpactCategoryDocument
  /legacy_tracks/{id}               HomebrewLegacyTrackDocument
  /oracle_tables/{id}               HomebrewOracleTableDocument
  /oracle_collections/{id}          HomebrewOracleCollectionDocument
  /move_categories/{id}             HomebrewMoveCategoryDocument
  /moves/{id}                       HomebrewMoveDocument (4-variant union)
  /asset_collections/{id}           HomebrewAssetCollectionDocument
  /assets/{id}                      HomebrewAssetDocument
  /editorInviteKeys/{id}            { collectionId: string } (server-side only)

/users/{userId}                     UserDocument
  /custom-moves/custom-moves        CustomMoveDocument (deprecated, embedded map)
  /custom-oracles/custom-oracles    CustomOracleDocument (deprecated, embedded map)
  /settings/accessibility           AccessibilitySettingsDocument
  /settings/oracle                  OracleSettingsDocument
  /ai-rate-limit/**                 Rate limit counters (server-side write only)
```

---

## FIREBASE PACKAGES

**`package.json`:**
- `firebase: ^10.12.0`

**`functions/package.json`:**
- `firebase-admin: ^12.0.0`
- `firebase-functions: ^7.2.2`
- `@anthropic-ai/sdk: ^0.79.0`
- `openai: ^6.29.0`

---

## SUPABASE MIGRATION TARGETS

| Firebase | Supabase |
|---------|---------|
| Firebase Auth | Supabase GoTrue (Google OAuth, email OTP) |
| Firestore | PostgreSQL (PostgREST + RLS) |
| Firebase Storage | Supabase Storage |
| Cloud Functions (onCall) | Supabase Edge Functions (Deno) |
| `httpsCallable()` | `supabase.functions.invoke()` |
| `onSnapshot()` | Supabase Realtime (postgres_changes) |
| `firebase.config.ts` | `supabase.config.ts` (single client) |
| 2 Firebase projects | 1 Supabase instance (game system = `worlds.setting_key`) |
