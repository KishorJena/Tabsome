# Library Sync API

Single endpoint for bidirectional synchronization between client devices and the server.

**Endpoints:** 
- `GET /api/v3/users/me/library/sync` (or `GET /api/sync`) — Discover sync state (initialization status, primary collection details, latest cursor, total item count).
- `POST /api/v3/users/me/library/sync` (or `POST /api/sync`) — Perform bidirectional library sync.

**Authentication:** Bearer token (Supabase JWT) in the `Authorization` header.

---

## Sync Discovery (GET)

```http
GET /api/v3/users/me/library/sync
Authorization: Bearer <access_token>
```

### Response (Initialized)

```json
{
  "success": true,
  "data": {
    "initialized": true,
    "collection": {
      "id": "collection-uuid",
      "name": "My Library",
      "description": null,
      "color": null,
      "icon": null,
      "isSystem": false,
      "createdAt": "2026-07-04T13:46:30.000Z",
      "updatedAt": "2026-07-04T14:12:46.000Z"
    },
    "cursor": 845,
    "itemCount": 120
  }
}
```

### Response (Not Initialized)

```json
{
  "success": true,
  "data": {
    "initialized": false,
    "collection": null,
    "cursor": null,
    "itemCount": 0
  }
}
```

---

## How It Works

The client maintains a single opaque `cursor` value. On every sync call, the client sends:

1. Its current cursor (or `null` for the first sync)
2. Any local changes (creates, updates, deletes)

The server responds with:

1. A new `nextCursor` — client stores this for the next call
2. `applied` — server-canonical snapshots of what the client uploaded
3. `updates` — entities changed by other devices since the cursor
4. `deleted` — entity IDs removed by other devices since the cursor
5. `rejected` — entities the server refused, with reasons

---

## Request

```http
POST /api/v3/users/me/library/sync
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Body

```json
{
  "cursor": 42,
  "changes": {
    "upserts": {
      "collections": [],
      "folders": [],
      "items": [],
      "tags": []
    },
    "deletes": {
      "collection_ids": [],
      "folder_ids": [],
      "item_ids": [],
      "tag_ids": []
    }
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `cursor` | `number \| null` | ✅ | Last `nextCursor` received from the server. Send `null` on first sync. |
| `changes` | `object` | ❌ | Omit entirely or send empty arrays if client has nothing to upload. |
| `changes.upserts` | `object` | ❌ | Entities to create or update. |
| `changes.deletes` | `object` | ❌ | Entity IDs to soft-delete. |

### Client Rules

- **Always send `cursor`.** `null` for the first sync, otherwise the last `nextCursor` you received.
- **Never construct or increment the cursor.** It is opaque. Store it, replay it.
- **Never send timestamps.** Do not send `createdAt`, `updatedAt`, or `deletedAt`. The server owns all timestamps.
- **Always replace your stored cursor** with `nextCursor` from every successful response.
- **Both `snake_case` and `camelCase` keys are accepted** for entity fields in the request. The response always uses `camelCase`.

---

## Response

```json
{
  "success": true,
  "data": {
    "nextCursor": 43,

    "applied": {
      "collections": [],
      "folders": [],
      "items": [],
      "tags": []
    },

    "updates": {
      "collections": [],
      "folders": [],
      "items": [],
      "tags": []
    },

    "deleted": {
      "collection_ids": [],
      "folder_ids": [],
      "item_ids": [],
      "tag_ids": []
    },

    "rejected": []
  }
}
```

| Field | Type | Description |
|---|---|---|
| `nextCursor` | `number` | Store this. Send it back as `cursor` in the next sync call. |
| `applied` | `object` | Server-canonical snapshots of entities the client uploaded **this call** and that were accepted. |
| `updates` | `object` | Entities changed by **other devices** since your cursor. Upsert these into local storage. |
| `deleted` | `object` | Entity IDs removed by **other devices** since your cursor. Remove these from local storage. |
| `rejected` | `array` | Entities the server refused. Each entry has `entityType`, `entityId`, and `reason`. |

> **Key invariant:** An entity that appears in `applied` will **never** also appear in `updates` or `deleted` in the same response.

---

## Entity Schemas

### Collection (upsert)

```json
{
  "id": "uuid",
  "name": "My Collection",
  "description": "Optional description",
  "color": "#ff5722",
  "icon": "folder"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `uuid` | ✅ | Client-generated UUID. |
| `name` | `string` | ✅ | Cannot be empty. |
| `description` | `string \| null` | ❌ | Defaults to `null`. |
| `color` | `string \| null` | ❌ | Hex color. Defaults to `null`. |
| `icon` | `string \| null` | ❌ | Icon identifier. Defaults to `null`. |

### Collection (response)

```json
{
  "id": "uuid",
  "name": "My Collection",
  "description": null,
  "color": null,
  "icon": null,
  "isSystem": false,
  "createdAt": "2026-07-04T13:46:30.000Z",
  "updatedAt": "2026-07-04T14:12:46.000Z"
}
```

---

### Folder (upsert)

```json
{
  "id": "uuid",
  "name": "Research",
  "collectionId": "uuid",
  "parentId": null,
  "sortOrder": 0,
  "enriched": true,
  "sources": "manual",
  "metadataVersion": 1
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `uuid` | ✅ | Client-generated UUID. |
| `name` | `string` | ✅ | Cannot be empty. |
| `collectionId` | `uuid` | ✅ | Parent collection. Also accepted as `collection_id`. |
| `parentId` | `uuid \| null` | ❌ | Parent folder for nesting. Defaults to `null` (root). Also accepted as `parent_id`. |
| `sortOrder` | `number \| null` | ❌ | Ordering within parent. Also accepted as `sort_order`. |
| `enriched` | `boolean` | ❌ | Defaults to `true`. |
| `sources` | `string` | ❌ | Defaults to `"manual"`. |
| `metadataVersion` | `number` | ❌ | Defaults to `1`. Also accepted as `metadata_version`. |

### Folder (response)

```json
{
  "id": "uuid",
  "name": "Research",
  "parentId": null,
  "collectionId": "uuid",
  "sortOrder": 0,
  "enriched": true,
  "enrichedAt": null,
  "lastEnrichAttempt": null,
  "sources": "manual",
  "metadataVersion": 1,
  "createdAt": "2026-07-04T13:46:30.000Z",
  "updatedAt": "2026-07-04T14:12:46.000Z",
  "isSystem": false
}
```

---

### Item — Link (upsert)

```json
{
  "id": "uuid",
  "type": "link",
  "collectionId": "uuid",
  "parentId": null,
  "sortOrder": 0,
  "url": "https://github.com",
  "title": "GitHub",
  "description": "Where the world builds software",
  "image": "https://github.com/og-image.png",
  "favicon": "https://github.com/favicon.ico",
  "needsPreview": false,
  "tags": ["javascript", "open-source"]
}
```

### Item — Note (upsert)

```json
{
  "id": "uuid",
  "type": "note",
  "collectionId": "uuid",
  "parentId": null,
  "sortOrder": 0,
  "title": "Meeting Notes",
  "content": [{ "type": "p", "html": "Action items..." }],
  "color": "yellow",
  "tags": ["work"]
}
```

### Item fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `uuid` | ✅ | Client-generated UUID. |
| `type` | `"link" \| "note"` | ✅ | Must be exactly `"link"` or `"note"`. |
| `collectionId` | `uuid` | ✅ | Parent collection. Also accepted as `collection_id`. |
| `parentId` | `uuid \| null` | ❌ | Parent folder. Defaults to `null` (root). Also accepted as `parent_id`. |
| `sortOrder` | `number \| null` | ❌ | Also accepted as `sort_order`. |
| `enriched` | `boolean` | ❌ | Defaults to `false`. |
| `enrichedAt` | `string \| null` | ❌ | ISO timestamp. Also accepted as `enriched_at`. |
| `lastEnrichAttempt` | `number \| null` | ❌ | Unix epoch ms. Also accepted as `last_enrich_attempt`. |
| `sources` | `string` | ❌ | Defaults to `"basic"`. |
| `metadataVersion` | `number` | ❌ | Defaults to `1`. Also accepted as `metadata_version`. |
| `tags` | `string[]` | ❌ | Array of tag name strings. Server auto-creates tags and manages the junction table. |

**Link-specific fields:**

| Field | Type | Notes |
|---|---|---|
| `url` | `string \| null` | The bookmark URL. |
| `title` | `string \| null` | Page title. |
| `description` | `string \| null` | Page description / excerpt. |
| `image` | `string \| null` | OG image or banner URL. |
| `favicon` | `string \| null` | Favicon URL. |
| `needsPreview` | `boolean` | Defaults to `false`. Also accepted as `needs_preview`. |

**Note-specific fields:**

| Field | Type | Notes |
|---|---|---|
| `title` | `string \| null` | Note title. |
| `content` | `json \| null` | Array of block objects. |
| `color` | `string` | Color theme name. Defaults to `"default"`. |

### Item (response)

```json
{
  "id": "uuid",
  "type": "link",
  "parentId": null,
  "collectionId": "uuid",
  "sortOrder": 0,
  "enriched": false,
  "enrichedAt": null,
  "lastEnrichAttempt": null,
  "sources": "basic",
  "metadataVersion": 1,
  "url": "https://github.com",
  "title": "GitHub",
  "description": "Where the world builds software",
  "image": null,
  "favicon": null,
  "needsPreview": false,
  "content": null,
  "color": null,
  "createdAt": "2026-07-04T13:46:30.000Z",
  "updatedAt": "2026-07-04T14:12:46.000Z",
  "isSystem": false,
  "tags": ["javascript", "open-source"]
}
```

> Items in the response always include a `tags` array of tag IDs (lowercase strings).

---

### Tag (upsert)

```json
{
  "id": "javascript",
  "name": "JavaScript"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | ✅ | Lowercase normalized tag identifier. Automatically lowercased by the server. |
| `name` | `string` | ✅ | Display name (preserves original casing). |

### Tag (response)

```json
{
  "id": "javascript",
  "name": "JavaScript",
  "createdAt": "2026-07-04T13:46:30.000Z",
  "updatedAt": "2026-07-04T14:12:46.000Z"
}
```

> Tags can also be created implicitly by including a `tags` array on items. The server ensures the tag exists before linking.

---

## Deletes

Send entity IDs to delete:

```json
{
  "deletes": {
    "collection_ids": ["uuid-1"],
    "folder_ids": ["uuid-2"],
    "item_ids": ["uuid-3", "uuid-4"],
    "tag_ids": ["javascript"]
  }
}
```

### Delete Behavior

| Entity | Mechanism | Cascade |
|---|---|---|
| Collection | Soft-delete (`deleted_at` set) | All child folders and items are also soft-deleted. |
| Folder | Soft-delete | All child items are also soft-deleted. |
| Item | Soft-delete | None. |
| Tag | **Hard-delete** | Junction table rows (`library_item_tags`) are removed via FK cascade. |

### Delete Rules

- `is_system` entities **cannot be deleted**. They are silently skipped.
- Already-deleted entities are silently skipped (idempotent).
- Entities not belonging to the authenticated user are silently skipped.

---

## Rejected Entries

When the server refuses a client change, it appears in the `rejected` array:

```json
{
  "entityType": "item",
  "entityId": "uuid",
  "reason": "missing required fields"
}
```

| Reason | Meaning |
|---|---|
| `missing required fields` | A required field (`id`, `name`, `type`, `collectionId`) was missing or empty. |
| `invalid item type` | Item `type` was not `"link"` or `"note"`. |
| `entity already soft-deleted` | Client tried to update an entity that has been deleted. Delete wins. |
| `db upsert failed` | Database-level error (FK violation, constraint error, etc). |

---

## Sync Flows

### 1. Bootstrap (First Sync)

Client has never synced before. It sends `cursor: null` and optionally uploads its local data.

```json
// Request
{
  "cursor": null,
  "changes": {
    "upserts": {
      "items": [
        { "id": "item-1", "type": "link", "collectionId": "col-1", "url": "https://github.com", "title": "GitHub" }
      ]
    }
  }
}
```

```json
// Response
{
  "success": true,
  "data": {
    "nextCursor": 1,
    "applied": {
      "collections": [],
      "folders": [],
      "items": [{ "id": "item-1", "type": "link", "url": "https://github.com", "title": "GitHub", "...": "..." }],
      "tags": []
    },
    "updates": {
      "collections": [/* all existing collections */],
      "folders": [/* all existing folders */],
      "items": [/* all existing items, excluding item-1 */],
      "tags": [/* all existing tags */]
    },
    "deleted": { "collection_ids": [], "folder_ids": [], "item_ids": [], "tag_ids": [] },
    "rejected": []
  }
}
```

**Client action:** Store `nextCursor = 1`. Merge `applied` and `updates` into local storage.

---

### 2. Incremental Sync (No Local Changes)

Client polls for changes made by other devices.

```json
// Request
{ "cursor": 1, "changes": {} }
```

```json
// Response (nothing changed)
{
  "success": true,
  "data": {
    "nextCursor": 1,
    "applied": { "collections": [], "folders": [], "items": [], "tags": [] },
    "updates": { "collections": [], "folders": [], "items": [], "tags": [] },
    "deleted": { "collection_ids": [], "folder_ids": [], "item_ids": [], "tag_ids": [] },
    "rejected": []
  }
}
```

**Client action:** Store `nextCursor = 1` (unchanged). Nothing to merge.

---

### 3. Client Creates an Entity

```json
// Request
{
  "cursor": 1,
  "changes": {
    "upserts": {
      "collections": [{ "id": "col-new", "name": "Work" }]
    }
  }
}
```

```json
// Response
{
  "success": true,
  "data": {
    "nextCursor": 2,
    "applied": {
      "collections": [{ "id": "col-new", "name": "Work", "isSystem": false, "createdAt": "...", "updatedAt": "...", "...": "..." }],
      "folders": [], "items": [], "tags": []
    },
    "updates": { "collections": [], "folders": [], "items": [], "tags": [] },
    "deleted": { "collection_ids": [], "folder_ids": [], "item_ids": [], "tag_ids": [] },
    "rejected": []
  }
}
```

**Client action:** Store `nextCursor = 2`. Replace local entity with the `applied` snapshot (server-canonical).

---

### 4. Client Updates an Entity

Send the full entity again with updated fields. The server upserts by `id`.

```json
// Request
{
  "cursor": 2,
  "changes": {
    "upserts": {
      "collections": [{ "id": "col-new", "name": "Work — Renamed" }]
    }
  }
}
```

**Client action:** Store the new `nextCursor`. Replace local entity with `applied` snapshot.

---

### 5. Client Deletes an Entity

```json
// Request
{
  "cursor": 3,
  "changes": {
    "deletes": {
      "collection_ids": ["col-new"]
    }
  }
}
```

```json
// Response
{
  "success": true,
  "data": {
    "nextCursor": 4,
    "applied": { "collections": [], "folders": [], "items": [], "tags": [] },
    "updates": { "collections": [], "folders": [], "items": [], "tags": [] },
    "deleted": {
      "collection_ids": ["col-new"],
      "folder_ids": [/* cascaded folder IDs */],
      "item_ids": [/* cascaded item IDs */],
      "tag_ids": []
    },
    "rejected": []
  }
}
```

**Client action:** Store `nextCursor = 4`. Remove all IDs listed in `deleted` from local storage.

---

### 6. Multi-Device Sync

This is the most important scenario.

```
Device A (cursor=10)         Server         Device B (cursor=10)
        |                      |                      |
        |--- rename item X --->|                      |
        |<-- nextCursor=12 ----|                      |
        |   applied: item X    |                      |
        |                      |                      |
        |                      |<--- cursor=10 -------|
        |                      |     changes: {}      |
        |                      |                      |
        |                      |--- nextCursor=12 --->|
        |                      |    updates: item X   |
        |                      |    (renamed version) |
```

Device B receives Device A's rename in `updates` because its cursor (10) is behind the change (cursor 12).

---

### 7. Retry / Idempotency

If the client sends the exact same request twice (same cursor, same changes), the server:

- Does **not** create duplicate rows
- Does **not** create duplicate changelog entries
- Returns the existing server-canonical entity in `applied`
- Returns `nextCursor` set to the latest database cursor (may differ from the first response)

---

## Error Responses

| Status | Code | Meaning |
|---|---|---|
| `401` | `unauthorized` | Missing or invalid auth token. |
| `400` | `invalid_json` | Request body is not valid JSON. |
| `400` | `invalid_cursor` | `cursor` must be a number or `null`. |
| `500` | `internal_server_error` | Unexpected server error. |

### Error shape

```json
{
  "success": false,
  "error": {
    "code": "unauthorized",
    "message": "Unauthorized"
  }
}
```

---

## Conflict Resolution

| Scenario | Resolution |
|---|---|
| Two devices edit the same entity | Last sync to arrive wins (LWW). Changelog makes the sequence auditable. |
| Client updates a soft-deleted entity | **Rejected.** Delete wins. Entity appears in `rejected` with reason `"entity already soft-deleted"`. |
| Client sends an ID that doesn't exist | Created as a new entity (`CREATE` operation). |
| Client sends an `is_system` entity | Write is silently skipped. Existing server row returned in `applied`. |

---

## Quick Reference: Client Sync Loop

```
function sync(localChanges) {
  const cursor = storage.get("syncCursor")   // null on first run

  const response = await fetch("/api/v3/users/me/library/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      cursor: cursor,
      changes: localChanges
    })
  })

  const { data } = await response.json()

  // 1. Replace cursor
  storage.set("syncCursor", data.nextCursor)

  // 2. Merge applied entities (server-canonical versions of what we uploaded)
  upsertLocal(data.applied)

  // 3. Merge updates from other devices
  upsertLocal(data.updates)

  // 4. Remove deleted entities
  removeLocal(data.deleted)

  // 5. Handle rejections (log, notify user, discard local edits)
  handleRejected(data.rejected)
}
```
