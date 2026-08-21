# Roadmap & Feature Suggestions API (v3)

The Roadmap API allows client applications (browser extensions, web apps, mobile apps, marketing site) to showcase upcoming features and fixes, enable users to react/upvote items, and submit their own ideas and suggestions.

---

## Architecture & Lifecycle

### Item Types
- `feature`: New features or major capabilities.
- `fix`: Bug fixes, reliability improvements, or performance patches.
- `improvement`: Enhancements to existing features.

### Lifecycle Statuses
- `under_review`: Community suggestions or ideas awaiting team assessment.
- `planned`: Accepted and queued for upcoming development.
- `in_progress`: Actively being engineered.
- `completed`: Shipped and available in production.
- `closed`: Declined, archived, or duplicate.

---

## Authentication & Identity

- **Public Retrieval**: `GET /api/v3/roadmap` and `GET /api/v3/roadmap/:id` are public.
- **Reactions & Suggestions**:
  - Authenticated users pass `Authorization: Bearer <supabase_or_google_token>`.
  - Anonymous / extension users pass `x-installation-id: <uuid>` or provide `installationId` in request payload / query parameters.
- **Admin Management**: All `/api/v3/admin/roadmap/*` endpoints require `x-admin-api-key: <ADMIN_API_KEY>` or admin session cookie.

---

## Client API Endpoints

### 1. List Roadmap Items
**`GET /api/v3/roadmap`**

Retrieve published roadmap items with filtering, search, sorting, and user-specific reaction states.

#### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | `string` | optional | Filter by status or comma-separated list (e.g. `planned,in_progress,completed`) |
| `type` | `string` | optional | Filter by item type: `feature`, `fix`, `improvement` |
| `search` | `string` | optional | Text search across title and description |
| `sort` | `string` | `votes` | Sort order: `votes` (default: pinned first, highest votes, newest) or `recent` (newest first) |
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `20` | Items per page (max: 100) |
| `installationId` | `string` | optional | Installation ID to personalize `hasVoted` and `userReaction` (can also be passed via header) |

#### Example Request
```http
GET /api/v3/roadmap?status=in_progress,planned&sort=votes HTTP/1.1
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
      "authorEmail": null,
      "isPublished": true,
      "isPinned": true,
      "metadata": {},
      "createdAt": "2026-08-20T10:00:00Z",
      "updatedAt": "2026-08-20T12:00:00Z",
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
**`GET /api/v3/roadmap/:id`**

Retrieve details for a single published roadmap item.

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
    "targetVersion": "v2.2.0",
    "tags": ["sync", "themes"],
    "voteCount": 42,
    "reactionsCount": {
      "upvote": 42
    },
    "isPublished": true,
    "isPinned": false,
    "hasVoted": true,
    "userReaction": "upvote",
    "createdAt": "2026-08-20T10:00:00Z",
    "updatedAt": "2026-08-20T12:00:00Z"
  }
}
```

---

### 3. Submit Suggestion / Feature Request
**`POST /api/v3/roadmap/suggestions`**

Allows users to submit a new feature request or fix idea. Submissions automatically start in `under_review` status.

#### Request Body
```json
{
  "title": "Add keyboard shortcuts for fast folder switching",
  "description": "It would be great to jump between folders using Alt+1, Alt+2.",
  "type": "feature",
  "authorName": "Alex",
  "authorEmail": "alex@example.com",
  "installationId": "74d812e9-4e6f-40be-8422-921a221f7c00",
  "metadata": {
    "source": "extension_popup"
  }
}
```

#### Example Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "55c48b11-d0e5-4d04-8b64-00e95ff92a18",
    "title": "Add keyboard shortcuts for fast folder switching",
    "description": "It would be great to jump between folders using Alt+1, Alt+2.",
    "type": "feature",
    "status": "under_review",
    "voteCount": 1,
    "reactionsCount": {
      "upvote": 1
    },
    "isPublished": true,
    "hasVoted": true,
    "userReaction": "upvote",
    "createdAt": "2026-08-20T17:15:00Z",
    "updatedAt": "2026-08-20T17:15:00Z"
  },
  "message": "Suggestion submitted successfully"
}
```

---

### 4. React / Upvote an Item
**`POST /api/v3/roadmap/:id/react`**

Add an upvote or reaction to a roadmap item.

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
    "itemId": "55c48b11-d0e5-4d04-8b64-00e95ff92a18",
    "reactionType": "upvote",
    "hasVoted": true,
    "userReaction": "upvote",
    "voteCount": 2,
    "reactionsCount": {
      "upvote": 2
    }
  }
}
```

---

### 5. Remove Upvote / Reaction
**`DELETE /api/v3/roadmap/:id/react`**

Remove the user's upvote or reaction.

#### Query Parameters
- `reactionType`: Type of reaction to delete (default: `upvote`)
- `installationId`: Optional fallback if not using header/token.

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "itemId": "55c48b11-d0e5-4d04-8b64-00e95ff92a18",
    "reactionType": "upvote",
    "hasVoted": false,
    "userReaction": null,
    "voteCount": 1,
    "reactionsCount": {
      "upvote": 1
    }
  }
}
```

---

## Admin API Endpoints

All admin endpoints require `x-admin-api-key: <ADMIN_API_KEY>`.

### 1. List All Roadmap Items
**`GET /api/v3/admin/roadmap`**
- Query parameters: `search`, `status`, `type`, `isPublished`, `isPinned`, `page`, `limit`.
- Returns all items including draft/unpublished and community suggestions.

### 2. Create Official Item
**`POST /api/v3/admin/roadmap`**

```json
{
  "title": "Biometric Authentication Lock",
  "description": "Unlock sensitive bookmarks using TouchID / Windows Hello.",
  "type": "feature",
  "status": "planned",
  "targetVersion": "v2.3",
  "tags": ["security", "auth"],
  "isPublished": true,
  "isPinned": false
}
```

### 3. Update Roadmap Item
**`PATCH /api/v3/admin/roadmap/:id`**

Promote community suggestions, update status to `in_progress` or `completed`, change target release versions, or toggle visibility.

```json
{
  "status": "in_progress",
  "targetVersion": "v2.2.0",
  "isPinned": true
}
```

### 4. Delete Roadmap Item
**`DELETE /api/v3/admin/roadmap/:id`**

Permanently deletes the roadmap item and cascades removal of associated reactions.
