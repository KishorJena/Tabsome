# User-Scoped Library REST API (v3)

Authenticated endpoints for managing user collections, folders, items (links & notes), tags, and sharing.

**Authentication:** Supabase JWT Bearer token in the `Authorization: Bearer <access_token>` header.

---

## Table of Contents
- [1. Collections](#1-collections)
  - [List Collections](#list-user-collections)
  - [Create Collection](#create-user-collection)
  - [Get Collection Details](#get-user-collection-details)
  - [Update Collection](#update-user-collection)
  - [Delete Collection](#delete-user-collection)
- [2. Folders](#2-folders)
  - [List Folders](#list-folders)
  - [Create Folder](#create-folder)
  - [Get Single Folder](#get-single-folder)
  - [Update Folder](#update-folder)
  - [Delete Folder](#delete-folder)
- [3. Items (Links & Notes)](#3-items-links--notes)
  - [List Items](#list-items)
  - [Create Item](#create-item)
  - [Bulk Update Items](#bulk-update-items)
  - [Bulk Delete Items](#bulk-delete-items)
  - [Get Single Item](#get-single-item)
  - [Update Single Item](#update-single-item)
  - [Delete Single Item](#delete-single-item)
- [4. Tags](#4-tags)
  - [List Tags](#list-tags)
  - [Create Tag](#create-tag)
  - [Get Single Tag](#get-single-tag)
  - [Rename Tag](#rename-tag)
  - [Delete Tag](#delete-tag)
- [5. Sharing & Collaboration](#5-sharing--collaboration)
  - [List Shares](#list-shares)
  - [Create Share Grant](#create-share-grant)
  - [Update Share Grant](#update-share-grant)
  - [Revoke Share Grant](#revoke-share-grant)

---

## 1. Collections

### List User Collections
Retrieves all active collections belonging to the authenticated user with folder, link, and note counts.

**Endpoint:** `GET /api/v3/users/me/library/collections`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "c71e2f64-5a21-4f76-96ea-635293671234",
      "name": "My Workspace",
      "description": "Daily bookmarks and snippets",
      "color": "#3b82f6",
      "icon": "folder",
      "isSystem": false,
      "createdAt": "2026-07-04T13:46:30.000Z",
      "updatedAt": "2026-07-04T14:12:46.000Z",
      "foldersCount": 4,
      "linksCount": 18,
      "notesCount": 6
    }
  ]
}
```

### Create User Collection
**Endpoint:** `POST /api/v3/users/me/library/collections`

**Request Body:**
```json
{
  "name": "Project Apollo",
  "description": "Research notes and links for Project Apollo",
  "color": "#8b5cf6",
  "icon": "rocket"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Name of the collection (non-empty). |
| `description` | `string \| null` | ❌ | Optional description. |
| `color` | `string \| null` | ❌ | Optional color theme (hex or name). |
| `icon` | `string \| null` | ❌ | Optional icon identifier. |

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "c71e2f64-5a21-4f76-96ea-635293671234",
    "name": "Project Apollo",
    "description": "Research notes and links for Project Apollo",
    "color": "#8b5cf6",
    "icon": "rocket",
    "isSystem": false,
    "createdAt": "2026-07-04T13:46:30.000Z",
    "updatedAt": "2026-07-04T14:12:46.000Z"
  }
}
```

### Get User Collection Details
Retrieves metadata, active folders, and active items (with tags) for a specific collection.

**Endpoint:** `GET /api/v3/users/me/library/collections/:collectionId`

**Response:**
```json
{
  "success": true,
  "data": {
    "collection": { ... },
    "folders": [ ... ],
    "items": [ ... ]
  }
}
```

### Update User Collection
**Endpoint:** `PATCH /api/v3/users/me/library/collections/:collectionId`

**Request Body:**
```json
{
  "name": "Renamed Apollo Project",
  "color": "#ec4899"
}
```

**Response:** `200 OK` with updated collection object.

### Delete User Collection
Soft-deletes the collection (`deleted_at` timestamp) and cascade soft-deletes all folders and items contained in it.

**Endpoint:** `DELETE /api/v3/users/me/library/collections/:collectionId`

**Response:**
```json
{
  "success": true,
  "message": "Collection deleted successfully."
}
```

---

## 2. Folders

### List Folders
Lists active folders inside a collection.

**Endpoint:** `GET /api/v3/users/me/library/collections/:collectionId/folders`

**Query Parameters:**
- `parentId` (optional): Filter by parent folder UUID. Use `?parentId=null` or `?parentId=` to query root-level folders only.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "7b8d4e92-c10a-4b72-b883-fa938dc81b29",
      "name": "Frontend Architecture",
      "parentId": null,
      "collectionId": "c71e2f64-5a21-4f76-96ea-635293671234",
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
  ]
}
```

### Create Folder
**Endpoint:** `POST /api/v3/users/me/library/collections/:collectionId/folders`

**Request Body:**
```json
{
  "name": "State Management",
  "parentId": "7b8d4e92-c10a-4b72-b883-fa938dc81b29",
  "sortOrder": 0
}
```

### Get Single Folder
**Endpoint:** `GET /api/v3/users/me/library/collections/:collectionId/folders/:folderId`

### Update Folder
Partially updates folder name, `sortOrder`, or moves parent folder (`parentId`). Detects and prevents circular nesting cycles.

**Endpoint:** `PATCH /api/v3/users/me/library/collections/:collectionId/folders/:folderId`

**Request Body:**
```json
{
  "name": "UI & State Management",
  "sortOrder": 1,
  "parentId": null
}
```

### Delete Folder
Cascade soft-deletes the folder and all nested descendant folders and items.

**Endpoint:** `DELETE /api/v3/users/me/library/collections/:collectionId/folders/:folderId`

---

## 3. Items (Links & Notes)

Items are polymorphic. The `type` must be `"link"` or `"note"`.

### List Items
**Endpoint:** `GET /api/v3/users/me/library/collections/:collectionId/items`

**Query Parameters:**
- `type` (optional): `"link"` or `"note"`
- `parentId` (optional): Folder UUID or `"null"` for root items
- `tagId` (optional): Filter items by tag slug (e.g. `?tagId=javascript`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "f8a7e034-7a3b-419b-bc9d-c59828e1467a",
      "type": "link",
      "parentId": null,
      "collectionId": "c71e2f64-5a21-4f76-96ea-635293671234",
      "sortOrder": 0,
      "url": "https://react.dev",
      "title": "React",
      "description": "The library for web and native user interfaces",
      "image": "https://react.dev/og.png",
      "favicon": "https://react.dev/favicon.ico",
      "needsPreview": false,
      "content": null,
      "color": "default",
      "enriched": true,
      "enrichedAt": "2026-07-04T13:48:00.000Z",
      "lastEnrichAttempt": null,
      "sources": "basic",
      "metadataVersion": 1,
      "createdAt": "2026-07-04T13:46:30.000Z",
      "updatedAt": "2026-07-04T14:12:46.000Z",
      "isSystem": false,
      "tags": ["react", "frontend"]
    }
  ]
}
```

### Create Item
**Endpoint:** `POST /api/v3/users/me/library/collections/:collectionId/items`

**Link Request:**
```json
{
  "type": "link",
  "parentId": null,
  "url": "https://github.com",
  "title": "GitHub",
  "description": "Where the world builds software",
  "tags": ["git", "devtools"]
}
```

**Note Request:**
```json
{
  "type": "note",
  "parentId": null,
  "title": "Sprint Goals",
  "content": [
    { "type": "p", "html": "Finish library docs." }
  ],
  "color": "yellow",
  "tags": ["work"]
}
```

> Tags passed in `tags: string[]` are automatically upserted into `library_tags` and reconciled in `library_item_tags`.

### Bulk Update Items
**Endpoint:** `PATCH /api/v3/users/me/library/collections/:collectionId/items`

**Request Body:**
```json
{
  "items": [
    {
      "id": "item-uuid-1",
      "sortOrder": 0,
      "parentId": "folder-uuid"
    },
    {
      "id": "item-uuid-2",
      "sortOrder": 1,
      "tags": ["updated-tag"]
    }
  ]
}
```

### Bulk Delete Items
**Endpoint:** `DELETE /api/v3/users/me/library/collections/:collectionId/items`

**Request Body:**
```json
{
  "ids": ["item-uuid-1", "item-uuid-2"]
}
```

### Get Single Item
**Endpoint:** `GET /api/v3/users/me/library/collections/:collectionId/items/:itemId`

### Update Single Item
**Endpoint:** `PATCH /api/v3/users/me/library/collections/:collectionId/items/:itemId`

**Request Body:**
```json
{
  "title": "Updated Title",
  "tags": ["react", "typescript"]
}
```

### Delete Single Item
Soft-deletes a single item (`deleted_at` set).

**Endpoint:** `DELETE /api/v3/users/me/library/collections/:collectionId/items/:itemId`

---

## 4. Tags

Tags are user-scoped entities (`library_tags` has primary key `(user_id, id)`).

### List Tags
**Endpoint:** `GET /api/v3/users/me/library/collections/:collectionId/tags`

**Query Parameters:**
- `usedIn=true` (optional): If set, filters only tags attached to items in this specific collection. Otherwise returns all user tags.

### Create Tag
**Endpoint:** `POST /api/v3/users/me/library/collections/:collectionId/tags`

**Request Body:**
```json
{
  "name": "Machine Learning"
}
```
> The slug `id` will automatically be lowercase `"machine learning"`.

### Get Single Tag
**Endpoint:** `GET /api/v3/users/me/library/collections/:collectionId/tags/:tagId`

### Rename Tag
Updates the display name of the tag (the normalized `id` slug remains unchanged).

**Endpoint:** `PATCH /api/v3/users/me/library/collections/:collectionId/tags/:tagId`

**Request Body:**
```json
{
  "name": "ML & AI"
}
```

### Delete Tag
Hard-deletes the tag. All references in `library_item_tags` are removed via database foreign key cascade.

**Endpoint:** `DELETE /api/v3/users/me/library/collections/:collectionId/tags/:tagId`

---

## 5. Sharing & Collaboration

### List Shares
Returns all sharing records for the collection, with recipient profile info (avatar, name, email).

**Endpoint:** `GET /api/v3/users/me/library/collections/:collectionId/shares`

### Create Share Grant
**Endpoint:** `POST /api/v3/users/me/library/collections/:collectionId/shares`

**Public Share Request:**
```json
{
  "share_type": "public",
  "access_role": "view",
  "expires_at": null
}
```

**User Collaboration Request:**
```json
{
  "share_type": "user",
  "shared_with_email": "colleague@example.com",
  "access_role": "edit",
  "expires_at": "2026-12-31T23:59:59.000Z"
}
```

### Update Share Grant
Updates role (`view` | `edit`), public visibility, or expiration.

**Endpoint:** `PUT /api/v3/users/me/library/collections/:collectionId/shares/:shareId`

**Request Body:**
```json
{
  "access_role": "edit",
  "expires_at": null
}
```

### Revoke Share Grant
Revokes recipient access or destroys the public share link.

**Endpoint:** `DELETE /api/v3/users/me/library/collections/:collectionId/shares/:shareId`
