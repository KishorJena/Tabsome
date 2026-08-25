# User Speed Dials API (Collections)

> **Backend Source:** [`src/app/api/v3/users/me/collections`](file:///c:/Users/ksrje/Documents/tabsome/tabsome-backend/src/app/api/v3/users/me/collections)  
> **Base Route:** `/api/v3/users/me/collections`  
> **Authentication:** Required (`Authorization: Bearer <supabase_access_token>`)

---

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [JSON Blob Data Shapes & Suggested Types](#json-blob-data-shapes--suggested-types)
   - [Why JSON Blob?](#why-json-blob)
   - [Collection Entity Shape](#collection-entity-shape)
   - [Discriminated Content Items (`ContentItem`)](#discriminated-content-items-contentitem)
   - [1. Link Item (`ContentLink`)](#1-link-item-contentlink)
   - [2. Folder Item (`ContentFolder`)](#2-folder-item-contentfolder)
   - [Comprehensive JSON Blob Example](#comprehensive-json-blob-example)
3. [Endpoints Reference](#endpoints-reference)
   - [1. List User Collections](#1-list-user-collections) (`GET /api/v3/users/me/collections`)
   - [2. Create Collection](#2-create-collection) (`POST /api/v3/users/me/collections`)
   - [3. Get Default Collection](#3-get-default-collection) (`GET /api/v3/users/me/collections/default`)
   - [4. Update Default Collection](#4-update-default-collection) (`PATCH /api/v3/users/me/collections/default`)
   - [5. Get Collection by ID](#5-get-collection-by-id) (`GET /api/v3/users/me/collections/:id`)
   - [6. Upsert / Update Collection by ID](#6-upsert--update-collection-by-id) (`PATCH /api/v3/users/me/collections/:id`)
   - [7. Delete Collection](#7-delete-collection) (`DELETE /api/v3/users/me/collections/:id`)
4. [Common Error Codes](#common-error-codes)
5. [Client Integration Helpers](#client-integration-helpers)
   - [Ready-to-Use TypeScript Definitions](#ready-to-use-typescript-definitions)
   - [Tree / Hierarchy Builder Helper](#tree--hierarchy-builder-helper)
   - [API Service Example](#api-service-example)

---

## Overview & Architecture

Speed dials in Tabsome are organized into **Collections** (`sd_collections` table).
Each collection contains a hydrated, flat array in the `content` property which holds all bookmarks (`link`) and directories (`folder`). Nested structures are expressed using `parentId`.

### Key Characteristics:
- **Hydrated JSON Blob:** Full collection content (links, folders, visual styling, positions) is stored and synchronized as a single JSON array inside `content`.
- **Flat Representation:** All items in `content` have an `id` and optional `parentId`. A `parentId` of `null` indicates root level.
- **CamelCase API Format:** The API automatically handles snake_case to camelCase conversion for all responses.

---

## JSON Blob Data Shapes & Suggested Types

### Why JSON Blob?
In the PostgreSQL database (`sd_collections`), the `content` column is stored as `JSONB`. Because `JSONB` is schema-agnostic at the database layer, the database itself does not enforce the internal properties of each bookmark or folder.

To ensure consistent typing across client applications (e.g. GitHub Pages, web dashboards, browser extensions), the TypeScript shapes defined below represent the contract for the items inside the `content` blob.

---

### Collection Entity Shape

```typescript
export interface SpeedDialCollection {
  id: string;                    // UUID
  createdBy: string;             // UUID of the owning user
  name: string;                  // Display title (e.g., "Work", "Favorites")
  icon: string | null;           // Optional icon identifier or name
  position: number;              // Display order rank
  isDefault: boolean;            // Whether this is the primary default collection
  isPublic: boolean;             // Whether public sharing is enabled
  isSystem: boolean;             // Always false for user collections
  systemType: string | null;     // null for user collections
  content: ContentItem[];        // The hydrated JSON blob array
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

---

### Discriminated Content Items (`ContentItem`)

The `content` array contains a mix of **Links** and **Folders**, discriminated by the `"type"` field:

```typescript
export type ContentItem = ContentLink | ContentFolder;
```

---

### 1. Link Item (`ContentLink`)

Represents a single bookmark / speed dial tile.

```typescript
export type SDThumbnailType = 'cover' | 'favicon' | 'custom' | string;
export type SDImageType = 'cloud' | 'custom' | 'default' | string;

export interface ContentLink {
  type: 'link';                  // Discriminated union key
  id: string;                    // Unique identifier (UUID or nanoid)
  parentId: string | null;       // null if at root level; Folder ID if inside a folder
  name: string;                  // Label displayed to the user
  url: string;                   // Target link destination
  image: string | null;          // Icon/thumbnail URL or data URL
  thumbnailType: SDThumbnailType;// Display mode ('cover' | 'favicon' | 'custom')
  imageType: SDImageType;        // Storage source ('cloud' | 'custom' | 'default')
  bgColor: string | null;        // Background tile color hex (e.g., "#24292e")
  createdAt?: string;            // ISO timestamp
  updatedAt?: string | null;     // ISO timestamp
  isSystem?: boolean;            // System item flag (optional)
}
```

#### Field Details:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `type` | `'link'` | **Yes** | Constant discriminator `'link'` |
| `id` | `string` | **Yes** | Unique identifier for this item within the collection |
| `parentId` | `string \| null` | **Yes** | `null` for root items, or matching a folder's `id` |
| `name` | `string` | **Yes** | Tile title / website title |
| `url` | `string` | **Yes** | Destination web URL (e.g. `https://github.com`) |
| `image` | `string \| null` | No | Image URL or favicon URL (default `null`) |
| `thumbnailType` | `'cover' \| 'favicon' \| 'custom'` | No | Visual rendering style |
| `imageType` | `'cloud' \| 'custom' \| 'default'` | No | Image origin |
| `bgColor` | `string \| null` | No | CSS hex color string (e.g. `"#FF0000"`, `"#1E293B"`) |
| `createdAt` | `string` | No | Creation timestamp ISO string |
| `updatedAt` | `string \| null` | No | Last modification timestamp ISO string |

---

### 2. Folder Item (`ContentFolder`)

Represents a group or folder containing other links or subfolders.

```typescript
export interface ContentFolder {
  type: 'folder';                // Discriminated union key
  id: string;                    // Unique identifier (UUID or nanoid)
  parentId: string | null;       // null if at root level; Folder ID if nested
  name: string;                  // Folder title (e.g., "Developer Tools")
  isSystem?: boolean;            // System item flag (optional)
}
```

#### Field Details:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `type` | `'folder'` | **Yes** | Constant discriminator `'folder'` |
| `id` | `string` | **Yes** | Unique folder ID |
| `parentId` | `string \| null` | **Yes** | `null` if top-level, or parent folder ID |
| `name` | `string` | **Yes** | Folder name |

---

### Comprehensive JSON Blob Example

Here is an example of what a complete `content` JSON blob looks like with root links, a folder, and child links:

```json
[
  {
    "type": "link",
    "id": "c3938b8e-9086-46c5-bf63-871629fa8f5d",
    "parentId": null,
    "name": "GitHub",
    "url": "https://github.com",
    "image": "https://github.githubassets.com/favicons/favicon.svg",
    "thumbnailType": "cover",
    "imageType": "cloud",
    "bgColor": "#24292e",
    "createdAt": "2026-08-20T10:00:00.000Z",
    "updatedAt": "2026-08-20T10:00:00.000Z"
  },
  {
    "type": "folder",
    "id": "78a5bf23-8687-4322-921c-a337424d6738",
    "parentId": null,
    "name": "Cloud & Hosting"
  },
  {
    "type": "link",
    "id": "b1827cf4-1311-40be-930b-55444a719918",
    "parentId": "78a5bf23-8687-4322-921c-a337424d6738",
    "name": "AWS Console",
    "url": "https://aws.amazon.com/console/",
    "image": "https://a0.awsstatic.com/libra-css/images/site/fav/favicon.ico",
    "thumbnailType": "cover",
    "imageType": "cloud",
    "bgColor": "#232F3E",
    "createdAt": "2026-08-20T10:05:00.000Z",
    "updatedAt": "2026-08-20T10:05:00.000Z"
  },
  {
    "type": "link",
    "id": "5fa23d11-536f-47dc-9ba7-767ec6b8969e",
    "parentId": "78a5bf23-8687-4322-921c-a337424d6738",
    "name": "Supabase Dashboard",
    "url": "https://supabase.com/dashboard",
    "image": "https://supabase.com/favicon/favicon.ico",
    "thumbnailType": "cover",
    "imageType": "cloud",
    "bgColor": "#3ECF8E",
    "createdAt": "2026-08-20T10:06:00.000Z",
    "updatedAt": "2026-08-20T10:06:00.000Z"
  }
]
```

---

## Endpoints

### 1. List User Collections
Fetch a lightweight list of all speed dial collections belonging to the authenticated user.

> **Note:** The `content` field is excluded from this list response to ensure fast load times. Use [Get Collection by ID](#5-get-collection-by-id) to fetch the full content.

- **Method:** `GET`
- **URL:** `/api/v3/users/me/collections`
- **Headers:**
  - `Authorization: Bearer <access_token>`

#### Response `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "18f8ce30-9fa6-4074-a021-ef781a953df4",
      "createdBy": "a7dfb5c2-2e6b-4e89-a2e6-7b24d77cb319",
      "name": "My Collection",
      "icon": "folder",
      "position": 0,
      "isDefault": true,
      "isPublic": false,
      "isSystem": false,
      "systemType": null,
      "createdAt": "2026-08-15T08:30:00.000Z",
      "updatedAt": "2026-08-20T11:45:00.000Z"
    },
    {
      "id": "3beaa905-2b4a-4428-912f-90e633d7b889",
      "createdBy": "a7dfb5c2-2e6b-4e89-a2e6-7b24d77cb319",
      "name": "Work",
      "icon": "briefcase",
      "position": 1,
      "isDefault": false,
      "isPublic": false,
      "isSystem": false,
      "systemType": null,
      "createdAt": "2026-08-18T09:12:00.000Z",
      "updatedAt": "2026-08-18T09:12:00.000Z"
    }
  ]
}
```

---

### 2. Create Collection
Create a new user speed dial collection.

- **Method:** `POST`
- **URL:** `/api/v3/users/me/collections`
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`

#### Request Body
```json
{
  "name": "Design Resources",
  "icon": "palette",
  "position": 2,
  "isDefault": false,
  "isPublic": false,
  "content": [
    {
      "type": "link",
      "id": "58652d8e-15d9-4340-9705-1a224f8d5570",
      "parentId": null,
      "name": "Figma",
      "url": "https://figma.com",
      "image": null,
      "thumbnailType": "cover",
      "imageType": "cloud",
      "bgColor": "#0ACF83"
    }
  ]
}
```

#### Response `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "d0efbc24-cfcb-41d7-b892-e421be01c51a",
    "createdBy": "a7dfb5c2-2e6b-4e89-a2e6-7b24d77cb319",
    "name": "Design Resources",
    "icon": "palette",
    "position": 2,
    "isDefault": false,
    "isPublic": false,
    "isSystem": false,
    "systemType": null,
    "content": [
      {
        "type": "link",
        "id": "58652d8e-15d9-4340-9705-1a224f8d5570",
        "parentId": null,
        "name": "Figma",
        "url": "https://figma.com",
        "image": null,
        "thumbnailType": "cover",
        "imageType": "cloud",
        "bgColor": "#0ACF83"
      }
    ],
    "createdAt": "2026-08-21T11:40:00.000Z",
    "updatedAt": "2026-08-21T11:40:00.000Z"
  }
}
```

---

### 3. Get Default Collection
Fetch the authenticated user's default speed dial collection with complete `content`.

> **Auto-creation:** If the user does not have a default collection yet, the server automatically initializes and returns an empty collection named `"My Collection"` with `isDefault: true`.

- **Method:** `GET`
- **URL:** `/api/v3/users/me/collections/default`
- **Headers:**
  - `Authorization: Bearer <access_token>`

#### Response `200 OK` (or `201 Created` if newly generated)
```json
{
  "success": true,
  "data": {
    "id": "18f8ce30-9fa6-4074-a021-ef781a953df4",
    "createdBy": "a7dfb5c2-2e6b-4e89-a2e6-7b24d77cb319",
    "name": "My Collection",
    "icon": "folder",
    "position": 0,
    "isDefault": true,
    "isPublic": false,
    "isSystem": false,
    "systemType": null,
    "content": [
      {
        "type": "link",
        "id": "42663989-13fe-425c-a5ef-e6c8913b7194",
        "parentId": null,
        "name": "YouTube",
        "url": "https://youtube.com",
        "image": "https://example.com/yt.png",
        "thumbnailType": "cover",
        "imageType": "cloud",
        "bgColor": "#FF0000"
      }
    ],
    "createdAt": "2026-08-15T08:30:00.000Z",
    "updatedAt": "2026-08-20T11:45:00.000Z"
  }
}
```

---

### 4. Update Default Collection
Update properties or content of the user's default collection. If a default collection does not exist yet, one will be created merged with the payload.

- **Method:** `PATCH`
- **URL:** `/api/v3/users/me/collections/default`
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`

#### Request Body
Provide only the fields you wish to update:
```json
{
  "name": "Main Speed Dials",
  "content": [
    {
      "type": "link",
      "id": "42663989-13fe-425c-a5ef-e6c8913b7194",
      "parentId": null,
      "name": "YouTube",
      "url": "https://youtube.com",
      "image": "https://example.com/yt.png",
      "thumbnailType": "cover",
      "imageType": "cloud",
      "bgColor": "#FF0000"
    },
    {
      "type": "link",
      "id": "9342557e-6169-42b7-a309-8b01a61c3609",
      "parentId": null,
      "name": "Reddit",
      "url": "https://reddit.com",
      "image": null,
      "thumbnailType": "cover",
      "imageType": "cloud",
      "bgColor": "#FF4500"
    }
  ]
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "18f8ce30-9fa6-4074-a021-ef781a953df4",
    "createdBy": "a7dfb5c2-2e6b-4e89-a2e6-7b24d77cb319",
    "name": "Main Speed Dials",
    "icon": "folder",
    "position": 0,
    "isDefault": true,
    "isPublic": false,
    "isSystem": false,
    "systemType": null,
    "content": [ ... ],
    "createdAt": "2026-08-15T08:30:00.000Z",
    "updatedAt": "2026-08-21T11:42:00.000Z"
  }
}
```

---

### 5. Get Collection by ID
Fetch full details and `content` of a specific collection owned by the user.

- **Method:** `GET`
- **URL:** `/api/v3/users/me/collections/:id`
- **Path Parameters:**
  - `id`: UUID of the collection
- **Headers:**
  - `Authorization: Bearer <access_token>`

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "18f8ce30-9fa6-4074-a021-ef781a953df4",
    "createdBy": "a7dfb5c2-2e6b-4e89-a2e6-7b24d77cb319",
    "name": "My Collection",
    "icon": "folder",
    "position": 0,
    "isDefault": true,
    "isPublic": false,
    "isSystem": false,
    "systemType": null,
    "content": [ ... ],
    "createdAt": "2026-08-15T08:30:00.000Z",
    "updatedAt": "2026-08-20T11:45:00.000Z"
  }
}
```

#### Error `404 Not Found`
Returned when the collection does not exist, belongs to another user, or has been soft-deleted.
```json
{
  "success": false,
  "error": {
    "code": "not_found",
    "message": "Collection not found"
  }
}
```

---

### 6. Upsert / Update Collection by ID
Update an existing collection or create a new collection with a predetermined UUID (**Upsert** pattern).

- **Method:** `PATCH`
- **URL:** `/api/v3/users/me/collections/:id`
- **Path Parameters:**
  - `id`: UUID of the collection
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`

#### Behavior:
- **If collection exists:** Performs a partial update on the provided fields (`name`, `icon`, `position`, `isDefault`, `isPublic`, `content`).
- **If collection does NOT exist:** Inserts a new record using the provided `:id` UUID. `name` is required.

#### Request Body
```json
{
  "name": "Updated Workspace",
  "content": [ ... ]
}
```

#### Response
- `200 OK` (when updating existing collection)
- `201 Created` (when creating a new collection with the given ID)

```json
{
  "success": true,
  "data": {
    "id": "18f8ce30-9fa6-4074-a021-ef781a953df4",
    "createdBy": "a7dfb5c2-2e6b-4e89-a2e6-7b24d77cb319",
    "name": "Updated Workspace",
    "icon": "folder",
    "position": 0,
    "isDefault": true,
    "isPublic": false,
    "isSystem": false,
    "systemType": null,
    "content": [ ... ],
    "createdAt": "2026-08-15T08:30:00.000Z",
    "updatedAt": "2026-08-21T11:43:00.000Z"
  }
}
```

---

### 7. Delete Collection
Soft-deletes a user collection (marks `deleted_at`).

- **Method:** `DELETE`
- **URL:** `/api/v3/users/me/collections/:id`
- **Path Parameters:**
  - `id`: UUID of the collection
- **Headers:**
  - `Authorization: Bearer <access_token>`

#### Response `204 No Content`
(Empty response body)

---

## Common Error Codes

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400` | `invalid_json` | Invalid JSON or empty body |
| `400` | `missing_fields` | A required field (e.g. `name`) was omitted |
| `400` | `invalid_param` | Data format error (e.g. `content` was not an array) |
| `400` | `invalid_id` | Invalid UUID provided for upsert |
| `400` | `no_updates` | No valid updatable fields provided in request body |
| `401` | `unauthorized` | Missing or expired Supabase authentication token |
| `404` | `not_found` | Resource does not exist or user lacks permission |
| `500` | `internal_server_error` | Server error |

---

## Client Integration Helpers

Copy and paste these snippets directly into your client/GitHub Pages application.

### TypeScript Interfaces

```typescript
export interface ContentLink {
  type: 'link';
  id: string;
  parentId: string | null;
  name: string;
  url: string;
  image?: string | null;
  thumbnailType?: string;
  imageType?: string;
  bgColor?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface ContentFolder {
  type: 'folder';
  id: string;
  parentId: string | null;
  name: string;
}

export type ContentItem = ContentLink | ContentFolder;

export interface SpeedDialCollection {
  id: string;
  createdBy: string;
  name: string;
  icon: string | null;
  position: number;
  isDefault: boolean;
  isPublic: boolean;
  isSystem: boolean;
  systemType: string | null;
  content: ContentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CollectionSummary {
  id: string;
  createdBy: string;
  name: string;
  icon: string | null;
  position: number;
  isDefault: boolean;
  isPublic: boolean;
  isSystem: boolean;
  systemType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}
```

---

### Tree / Hierarchy Builder

Since `content` is stored as a flat array with `parentId`, use this helper on the client to convert between flat and nested tree structures:

```typescript
export interface TreeNode {
  item: ContentItem;
  children: TreeNode[];
}

/**
 * Builds a hierarchical tree from a flat content array.
 */
export function buildContentTree(items: ContentItem[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // Initialize all nodes
  for (const item of items) {
    nodeMap.set(item.id, { item, children: [] });
  }

  // Assign children to parents
  for (const item of items) {
    const node = nodeMap.get(item.id)!;
    if (item.parentId && nodeMap.has(item.parentId)) {
      nodeMap.get(item.parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  return rootNodes;
}

/**
 * Flattens a hierarchical tree back into a flat array for saving.
 */
export function flattenContentTree(tree: TreeNode[], parentId: string | null = null): ContentItem[] {
  const result: ContentItem[] = [];

  for (const node of tree) {
    result.push({
      ...node.item,
      parentId,
    });
    if (node.children.length > 0) {
      result.push(...flattenContentTree(node.children, node.item.id));
    }
  }

  return result;
}
```

---

### API Service Example

```typescript
export class SpeedDialsApiService {
  constructor(
    private baseUrl: string,
    private getAccessToken: () => Promise<string | null>
  ) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return null as T;
    }

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error?.message || `HTTP error ${response.status}`);
    }

    return json.data;
  }

  // 1. List user collections (summaries)
  async listCollections(): Promise<CollectionSummary[]> {
    return this.request<CollectionSummary[]>('/api/v3/users/me/collections');
  }

  // 2. Get default collection with full content
  async getDefaultCollection(): Promise<SpeedDialCollection> {
    return this.request<SpeedDialCollection>('/api/v3/users/me/collections/default');
  }

  // 3. Get specific collection with full content
  async getCollection(id: string): Promise<SpeedDialCollection> {
    return this.request<SpeedDialCollection>(`/api/v3/users/me/collections/${id}`);
  }

  // 4. Create collection
  async createCollection(payload: {
    name: string;
    icon?: string;
    position?: number;
    isDefault?: boolean;
    isPublic?: boolean;
    content?: ContentItem[];
  }): Promise<SpeedDialCollection> {
    return this.request<SpeedDialCollection>('/api/v3/users/me/collections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 5. Update default collection
  async updateDefaultCollection(payload: Partial<SpeedDialCollection>): Promise<SpeedDialCollection> {
    return this.request<SpeedDialCollection>('/api/v3/users/me/collections/default', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // 6. Update / Upsert specific collection
  async upsertCollection(id: string, payload: Partial<SpeedDialCollection>): Promise<SpeedDialCollection> {
    return this.request<SpeedDialCollection>(`/api/v3/users/me/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // 7. Delete collection
  async deleteCollection(id: string): Promise<void> {
    return this.request<void>(`/api/v3/users/me/collections/${id}`, {
      method: 'DELETE',
    });
  }
}
```
