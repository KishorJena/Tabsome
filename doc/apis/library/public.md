# Public & Shared Library API (v3)

Public and shared endpoints for accessing system-provided collections and shared collections without authentication.

---

## 1. List Public Collections

### Endpoint
`GET /api/v3/library/collections`

### Description
Fetches all public (system) collections (`is_system = true`, `deleted_at IS NULL`) along with folder and item statistics.

### Authentication
None (Public read-only).

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Design Resources",
      "description": "Curated bookmarks and color palettes for designers",
      "color": "#ec4899",
      "icon": "palette",
      "isSystem": true,
      "createdAt": "2026-07-04T13:46:30.000Z",
      "updatedAt": "2026-07-04T14:12:46.000Z",
      "foldersCount": 3,
      "linksCount": 24,
      "notesCount": 5
    }
  ]
}
```

---

## 2. Get Public Collection Details

### Endpoint
`GET /api/v3/library/collections/:collectionId`

### Description
Fetches metadata, active folders, and active items (with associated tags) for a specific public collection.

### Authentication
None (Public read-only).

### Response
```json
{
  "success": true,
  "data": {
    "collection": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Design Resources",
      "description": "Curated bookmarks and color palettes for designers",
      "color": "#ec4899",
      "icon": "palette",
      "isSystem": true,
      "createdAt": "2026-07-04T13:46:30.000Z",
      "updatedAt": "2026-07-04T14:12:46.000Z"
    },
    "folders": [
      {
        "id": "f1a2b3c4-d5e6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Inspiration",
        "parentId": null,
        "sortOrder": 0,
        "enriched": true,
        "enrichedAt": null,
        "lastEnrichAttempt": null,
        "sources": "manual",
        "metadataVersion": 1,
        "createdAt": "2026-07-04T13:46:30.000Z",
        "updatedAt": "2026-07-04T14:12:46.000Z",
        "isSystem": true
      }
    ],
    "items": [
      {
        "id": "i1a2b3c4-d5e6-7a8b-9c0d-1e2f3a4b5c6d",
        "type": "link",
        "parentId": "f1a2b3c4-d5e6-7a8b-9c0d-1e2f3a4b5c6d",
        "collectionId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "sortOrder": 0,
        "url": "https://dribbble.com",
        "title": "Dribbble - Discover the World’s Top Designers",
        "description": "Find Top Designers & Creative Professionals on Dribbble.",
        "image": "https://cdn.dribbble.com/og.png",
        "favicon": "https://dribbble.com/favicon.ico",
        "needsPreview": false,
        "content": null,
        "color": "default",
        "enriched": true,
        "enrichedAt": "2026-07-04T14:00:00.000Z",
        "lastEnrichAttempt": null,
        "sources": "basic",
        "metadataVersion": 1,
        "isSystem": true,
        "createdAt": "2026-07-04T13:46:30.000Z",
        "updatedAt": "2026-07-04T14:12:46.000Z",
        "tags": ["design", "inspiration"]
      }
    ]
  }
}
```

---

## 3. Get Demo Public Collection

### Endpoint
`GET /api/v3/library/collections/demo`

### Description
Convenience route that retrieves the public collection named `"demo"` (case-insensitive) along with its active folders and items.

### Authentication
None (Public read-only).

### Response
Returns the identical payload shape as `GET /api/v3/library/collections/:collectionId`.

---

## 4. Resolve Shared Collection Link

### Endpoint
`GET /api/v3/shared/library/:shareToken`

### Description
Resolves a public share link token generated from `library_collection_shares`. Checks token existence, verifies `is_public = true`, validates that the link has not expired (`expires_at`), and returns the full collection contents (collection details, folders, and items with tags).

### Authentication
None (Public read-only).

### Error Codes
- `400 missing_param` — Share token parameter is missing.
- `404 not_found` — Share token not found or collection was deleted.
- `410 expired` — Share link has expired (`expires_at < now()`).

### Response
```json
{
  "success": true,
  "data": {
    "collection": {
      "id": "c71e2f64-5a21-4f76-96ea-635293671234",
      "name": "Shared Project Board",
      "description": "Resources for team onboarding",
      "color": "#10b981",
      "icon": "book",
      "isSystem": false,
      "createdAt": "2026-07-04T13:46:30.000Z",
      "updatedAt": "2026-07-04T14:12:46.000Z"
    },
    "folders": [...],
    "items": [...]
  }
}
```
