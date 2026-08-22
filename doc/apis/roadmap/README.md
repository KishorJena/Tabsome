# Roadmap & Feature Suggestions API

> **Base Route:** `/api/v3/roadmap`  
> **Authentication:** Optional for reading; Token or `x-installation-id` for reacting and submitting suggestions.  
> **Target Consumers:** Client apps (Web Apps, Browser Extensions, Mobile Apps, Marketing Sites, Portals).

---

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Data Types & Contract](#data-types--contract)
   - [Roadmap Item Entity](#roadmap-item-entity)
   - [Enums & Discriminated Unions](#enums--discriminated-unions)
3. [Authentication & Client Identity](#authentication--client-identity)
4. [Endpoints Reference](#endpoints-reference)
   - [1. List Published Roadmap Items](#1-list-published-roadmap-items) (`GET /api/v3/roadmap`)
   - [2. Get Single Roadmap Item](#2-get-single-roadmap-item) (`GET /api/v3/roadmap/:id`)
   - [3. Submit Community Suggestion](#3-submit-community-suggestion) (`POST /api/v3/roadmap/suggestions`)
   - [4. Add Reaction / Upvote](#4-add-reaction--upvote) (`POST /api/v3/roadmap/:id/react`)
   - [5. Remove Reaction / Upvote](#5-remove-reaction--upvote) (`DELETE /api/v3/roadmap/:id/react`)
5. [Error Handling & Status Codes](#error-handling--status-codes)
6. [Client Integration Example (TypeScript Service)](#client-integration-example-typescript-service)

---

## Overview & Architecture

The Roadmap API enables client applications to:
- Display live product roadmaps, release pipelines, and shipped features.
- Let users vote/upvote and react with emojis (e.g., `upvote`, `fire`, `rocket`, `like`).
- Submit new community feature requests and bug fix suggestions.
- Track personalized reaction status seamlessly for both authenticated users and anonymous browser extension installations.

---

## Data Types & Contract

### Roadmap Item Entity

```typescript
export type RoadmapItemType = 'feature' | 'fix' | 'improvement';

export type RoadmapItemStatus =
  | 'under_review'
  | 'considering'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'closed';

export type RoadmapItemSource = 'community' | 'official';

export type RoadmapReactionType = 'upvote' | 'like' | 'fire' | 'rocket' | string;

export interface RoadmapItem {
  id: string;                               // UUID primary key
  title: string;                            // Title (max 255 chars)
  description: string | null;               // Markdown or plain text description
  type: RoadmapItemType;                    // 'feature' | 'fix' | 'improvement'
  status: RoadmapItemStatus;                // Lifecycle state
  source: RoadmapItemSource;                // 'community' | 'official'
  targetVersion: string | null;             // e.g. "v2.1.0" or "Q3 2026"
  tags: string[];                           // Categorical tags (e.g. ["sync", "ui"])
  voteCount: number;                        // Total upvotes / main vote counter
  reactionsCount: Record<string, number>;   // Reactions breakdown (e.g. { "upvote": 12, "fire": 4 })
  userId: string | null;                    // Submitter user UUID (if authenticated)
  installationId: string | null;            // Submitter installation UUID (if anonymous)
  authorName: string | null;                // Attribution display name
  authorEmail: string | null;               // Submitter email (not exposed publicly)
  isPublished: boolean;                     // true for public feed
  isPinned: boolean;                        // true if pinned at top of roadmap
  metadata: Record<string, unknown>;        // Custom arbitrary metadata
  createdAt: string;                        // ISO 8601 timestamp
  updatedAt: string;                        // ISO 8601 timestamp
  
  // Client personalized flags (computed dynamically)
  hasVoted?: boolean;                       // true if current user/installation has voted
  userReaction?: string | null;             // Active reaction type for caller (e.g. "upvote")
}
```

---

## Authentication & Client Identity

The API supports a dual-identity model allowing both signed-in users and anonymous extension clients to interact:

1. **Authenticated Users:**
   - Pass header: `Authorization: Bearer <supabase_access_token>`
   - The user ID is automatically linked to votes and suggestions.

2. **Anonymous / Browser Extension Clients:**
   - Pass header: `x-installation-id: <uuid>` or query/body parameter: `installationId: <uuid>`
   - Keeps track of upvotes and suggestions per browser install without requiring login.

---

## Endpoints Reference

### 1. List Published Roadmap Items

Retrieve the public roadmap feed with multi-criteria filtering, search, sorting, pagination, and personalized reaction state.

- **Method:** `GET`
- **Path:** `/api/v3/roadmap`
- **Auth:** Optional (`x-installation-id` or `Authorization: Bearer <token>` for `hasVoted` indicators)

#### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | `string` | optional | Filter by status or comma-separated list (e.g. `planned,in_progress,completed`) |
| `type` | `string` | optional | Filter by type: `feature`, `fix`, `improvement` |
| `source` | `string` | optional | Filter by attribution: `community`, `official` |
| `search` | `string` | optional | Case-insensitive text search across title and description |
| `sort` | `string` | `votes` | Sort order: `votes` (pinned first, then highest votes, then newest) or `recent` (newest first) |
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `20` | Items per page (max: `100`) |
| `installationId` | `string` | optional | Optional fallback for `x-installation-id` header |

#### Example Request

```http
GET /api/v3/roadmap?status=in_progress,planned&source=official&sort=votes HTTP/1.1
Host: api.tabsome.com
x-installation-id: 74d812e9-4e6f-40be-8422-921a221f7c00
```

#### Example Response (`200 OK`)

```json
{
  "success": true,
  "data": [
    {
      "id": "a4d31484-9dbb-4fc4-bb9e-bfec4fe03fa4",
      "title": "Cloud Sync for Custom Themes",
      "description": "Automatically sync wallpaper palettes and custom themes across multiple browsers.",
      "type": "feature",
      "status": "in_progress",
      "source": "official",
      "targetVersion": "v2.2.0",
      "tags": ["sync", "themes", "ui"],
      "voteCount": 42,
      "reactionsCount": {
        "upvote": 42,
        "fire": 12
      },
      "userId": null,
      "installationId": null,
      "authorName": "TabSome Team",
      "isPublished": true,
      "isPinned": true,
      "metadata": {},
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-20T12:00:00.000Z",
      "hasVoted": true,
      "userReaction": "upvote"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### 2. Get Single Roadmap Item

Retrieve single published roadmap item details by ID.

- **Method:** `GET`
- **Path:** `/api/v3/roadmap/:id`
- **Auth:** Optional

#### Example Request

```http
GET /api/v3/roadmap/a4d31484-9dbb-4fc4-bb9e-bfec4fe03fa4 HTTP/1.1
Host: api.tabsome.com
x-installation-id: 74d812e9-4e6f-40be-8422-921a221f7c00
```

#### Example Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "id": "a4d31484-9dbb-4fc4-bb9e-bfec4fe03fa4",
    "title": "Cloud Sync for Custom Themes",
    "description": "Automatically sync wallpaper palettes and custom themes across multiple browsers.",
    "type": "feature",
    "status": "in_progress",
    "source": "official",
    "targetVersion": "v2.2.0",
    "tags": ["sync", "themes", "ui"],
    "voteCount": 42,
    "reactionsCount": {
      "upvote": 42,
      "fire": 12
    },
    "authorName": "TabSome Team",
    "isPublished": true,
    "isPinned": true,
    "metadata": {},
    "createdAt": "2026-08-20T10:00:00.000Z",
    "updatedAt": "2026-08-20T12:00:00.000Z",
    "hasVoted": true,
    "userReaction": "upvote"
  }
}
```

---

### 3. Submit Community Suggestion

Allows users to submit a feature idea or bug report.
- New suggestions are created with `status: "under_review"`, `source: "community"`, and `isPublished: false` for admin review.
- Automatically creates an initial upvote attributed to the author if identity is provided.

- **Method:** `POST`
- **Path:** `/api/v3/roadmap/suggestions`
- **Auth:** Optional (`x-installation-id` or `Authorization: Bearer <token>`)

#### Request Body

```json
{
  "title": "Keyboard shortcut to quickly open bookmarks in new tab",
  "description": "Allow pressing Ctrl+Shift+B to open the quick launcher popup directly.",
  "type": "feature",
  "authorName": "Alex",
  "authorEmail": "alex@example.com",
  "installationId": "74d812e9-4e6f-40be-8422-921a221f7c00",
  "metadata": {
    "source": "extension_popup",
    "browser": "Chrome 128"
  }
}
```

#### Field Specifications

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | **Yes** | Suggestion title (1 - 255 characters) |
| `description` | `string` | No | Suggestion details or problem description |
| `type` | `string` | No | `'feature'` (default), `'fix'`, or `'improvement'` |
| `authorName` | `string` | No | Display name of the submitter |
| `authorEmail` | `string` | No | Submitter contact email |
| `installationId` | `string` | No | Submitter client UUID (can also be in header) |
| `metadata` | `object` | No | Optional arbitrary client metadata |

#### Example Response (`201 Created`)

```json
{
  "success": true,
  "data": {
    "id": "55c48b11-d0e5-4d04-8b64-00e95ff92a18",
    "title": "Keyboard shortcut to quickly open bookmarks in new tab",
    "description": "Allow pressing Ctrl+Shift+B to open the quick launcher popup directly.",
    "type": "feature",
    "status": "under_review",
    "source": "community",
    "targetVersion": null,
    "tags": [],
    "voteCount": 1,
    "reactionsCount": {
      "upvote": 1
    },
    "userId": null,
    "installationId": "74d812e9-4e6f-40be-8422-921a221f7c00",
    "authorName": "Alex",
    "isPublished": false,
    "isPinned": false,
    "hasVoted": true,
    "userReaction": "upvote",
    "createdAt": "2026-08-22T11:00:00.000Z",
    "updatedAt": "2026-08-22T11:00:00.000Z"
  },
  "message": "Suggestion submitted successfully"
}
```

---

### 4. Add Reaction / Upvote

Add an upvote or emoji reaction to a roadmap item. If a reaction of a different type already exists for this caller, it is updated to the new type.

- **Method:** `POST`
- **Path:** `/api/v3/roadmap/:id/react`
- **Auth:** Required (`Authorization: Bearer <token>` OR `x-installation-id: <uuid>`)

#### Request Body

```json
{
  "reactionType": "upvote",
  "installationId": "74d812e9-4e6f-40be-8422-921a221f7c00"
}
```

#### Example Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "itemId": "a4d31484-9dbb-4fc4-bb9e-bfec4fe03fa4",
    "reactionType": "upvote",
    "hasVoted": true,
    "userReaction": "upvote",
    "voteCount": 43,
    "reactionsCount": {
      "upvote": 43,
      "fire": 12
    }
  }
}
```

---

### 5. Remove Reaction / Upvote

Remove an existing upvote or reaction from a roadmap item.

- **Method:** `DELETE`
- **Path:** `/api/v3/roadmap/:id/react`
- **Auth:** Required (`Authorization: Bearer <token>` OR `x-installation-id: <uuid>`)

#### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `reactionType` | `string` | `upvote` | Type of reaction to delete |
| `installationId` | `string` | optional | Submitter installation UUID if not using header |

#### Example Request

```http
DELETE /api/v3/roadmap/a4d31484-9dbb-4fc4-bb9e-bfec4fe03fa4/react?reactionType=upvote HTTP/1.1
Host: api.tabsome.com
x-installation-id: 74d812e9-4e6f-40be-8422-921a221f7c00
```

#### Example Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "itemId": "a4d31484-9dbb-4fc4-bb9e-bfec4fe03fa4",
    "reactionType": "upvote",
    "hasVoted": false,
    "userReaction": null,
    "voteCount": 42,
    "reactionsCount": {
      "upvote": 42,
      "fire": 12
    }
  }
}
```

---

## Error Handling & Status Codes

All errors return JSON in standard format:

```json
{
  "success": false,
  "error": {
    "code": "missing_identity",
    "message": "Authentication or installation ID header is required"
  }
}
```

| HTTP Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `missing_title` | Suggestion title is empty |
| `400 Bad Request` | `title_too_long` | Title exceeds 255 characters |
| `400 Bad Request` | `missing_identity` | Neither user token nor installationId provided |
| `404 Not Found` | `not_found` | Roadmap item does not exist or is unpublished |
| `500 Server Error`| `internal_server_error` | Internal processing failure |

---

## Client Integration Example (TypeScript Service)

```typescript
export interface FetchRoadmapOptions {
  status?: string;
  type?: 'feature' | 'fix' | 'improvement';
  source?: 'community' | 'official';
  search?: string;
  sort?: 'votes' | 'recent';
  page?: number;
  limit?: number;
}

export class RoadmapClient {
  constructor(
    private baseUrl: string = 'https://api.tabsome.com',
    private getInstallationId?: () => Promise<string | null> | string | null,
    private getAuthToken?: () => Promise<string | null> | string | null
  ) {}

  private async getHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    if (this.getInstallationId) {
      const instId = await this.getInstallationId();
      if (instId) headers['x-installation-id'] = instId;
    }

    return headers;
  }

  // 1. List Roadmap Items
  async listItems(options: FetchRoadmapOptions = {}) {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.type) params.set('type', options.type);
    if (options.source) params.set('source', options.source);
    if (options.search) params.set('search', options.search);
    if (options.sort) params.set('sort', options.sort);
    if (options.page) params.set('page', String(options.page));
    if (options.limit) params.set('limit', String(options.limit));

    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}/api/v3/roadmap?${params.toString()}`, {
      method: 'GET',
      headers,
    });
    return res.json();
  }

  // 2. Submit Feature Suggestion
  async submitSuggestion(payload: {
    title: string;
    description?: string;
    type?: 'feature' | 'fix' | 'improvement';
    authorName?: string;
    authorEmail?: string;
    metadata?: Record<string, unknown>;
  }) {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}/api/v3/roadmap/suggestions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  // 3. React / Upvote
  async react(itemId: string, reactionType: string = 'upvote') {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}/api/v3/roadmap/${itemId}/react`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reactionType }),
    });
    return res.json();
  }

  // 4. Remove Reaction / Upvote
  async removeReaction(itemId: string, reactionType: string = 'upvote') {
    const headers = await this.getHeaders();
    const res = await fetch(
      `${this.baseUrl}/api/v3/roadmap/${itemId}/react?reactionType=${encodeURIComponent(reactionType)}`,
      {
        method: 'DELETE',
        headers,
      }
    );
    return res.json();
  }
}
```
