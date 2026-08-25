# Widgets Client API (v3)

Public and client-facing API endpoints for applications (browser extensions, web apps, custom dashboards) to explore the public widget catalog, retrieve individual widget definitions, and create or share custom user widgets.

> **Note:** Admin-scoped endpoints (`/api/v3/admin/widgets/*`) are excluded from this guide.

---

## Overview

The Widgets API v3 provides client applications with:
1. **Catalog Exploration & Filtering (`GET /api/v3/widgets`)**: Search, paginate, and filter widgets by type, paid status, featured status, system flag, or fetch multiple widgets simultaneously by IDs.
2. **Single Widget Retrieval (`GET /api/v3/widgets/:id`)**: Retrieve full HTML/CSS/JS payload, metadata, host permissions, and render configurations for a single widget.
3. **Widget Creation & Sharing (`POST /api/v3/widgets`)**: Create custom widgets as an authenticated user or as a guest, enabling community sharing and custom dashboard extensibility.

---

## Authentication & Headers

| Scenario | Authentication | Headers |
|---|---|---|
| **Browsing Public Catalog** | None (Public) | Optional: `Content-Type: application/json` |
| **Fetching Widget Details** | None (Public) | Optional: `Content-Type: application/json` |
| **Creating Widget (Logged-in User)** | Recommended | `Authorization: Bearer <token>` or Session Cookie |
| **Creating Widget (Guest/Anonymous)** | Not Required | `Content-Type: application/json` |

When authenticated, created widgets are automatically linked to `created_by` (User UUID) and use the user's profile display name as `authorName`. For unauthenticated/guest requests, widgets are attributed to `"Guest"` with `created_by: null`.

---

## Data Models

### Widget Object (`Widget`)

All API responses return properties transformed into **camelCase**.

```typescript
export type WidgetType = 'spotlightWidget' | 'spotlightWidget2' | 'sidebarWidget' | string;
export type WidgetRenderMode = 'sandbox' | 'native';

export interface WidgetPayload {
  html: string;
  css: string;
  js: string;
}

export interface Widget {
  id: string;                       // Unique widget identifier (UUID format)
  title: string;                    // Name/title of the widget
  description: string;              // Detailed description
  type: WidgetType;                 // Type identifier (e.g., 'spotlightWidget', 'spotlightWidget2')
  widget: WidgetPayload | string;   // Code bundle object containing html, css, js (or JSON string)
  labels: string[];                 // Array of tags/labels for categorization
  createdBy: string | null;         // UUID of creator, or null for anonymous/system
  authorName: string | null;        // Display name of creator (e.g., "Jane Doe", "Guest")
  source: 'user' | 'tabsome';       // Origin of widget ('tabsome' for official, 'user' for custom)
  isListed: boolean;                // Whether the widget is listed in public discovery
  isFeatured: boolean;              // Highlighted/featured widget
  isPaid?: boolean;                 // Premium / paid tier flag
  isSystem?: boolean;               // System-provided built-in widget
  isPublic?: boolean;               // Public visibility flag
  isImmersive?: boolean;            // Immersive full-screen or expanded display mode
  renderMode?: WidgetRenderMode;    // Execution mode: 'sandbox' (isolated iframe) or 'native'
  hostPermissions: string[];        // Required network domain origins/patterns
  createdAt: string;                // ISO 8601 creation timestamp
  updatedAt: string;                // ISO 8601 last update timestamp
  deletedAt?: string | null;        // Soft-delete timestamp (null for active widgets)
}
```

### Pagination Metadata (`PaginationMeta`)

```typescript
export interface PaginationMeta {
  page: number;        // Current page number (1-indexed)
  limit: number;       // Items per page
  totalCount: number;  // Total matching records
  totalPages: number;  // Total number of pages
  hasMore: boolean;    // true if subsequent pages exist
}
```

---

## API Endpoints

### 1. List Widgets (Catalog & Search)

Retrieves a paginated list of public widgets matching the search criteria and filter parameters.

- **Endpoint:** `GET /api/v3/widgets`
- **Authentication:** None (Public)

#### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `integer` | `1` | Page number for pagination (minimum: `1`). |
| `limit` | `integer` | `20` | Number of items per page (minimum: `1`, maximum: `100`). |
| `search` | `string` | — | Case-insensitive title search (matches partial text). |
| `id` | `string` | — | Filter by a single specific widget ID. |
| `ids` | `string` | — | Comma-separated list of widget IDs for batch lookup (e.g. `id1,id2,id3`). |
| `type` | `string` | — | Filter by widget type (e.g. `spotlightWidget`, `spotlightWidget2`, `sidebarWidget`). Pass `'all'` to skip type filtering. |
| `is_paid` / `paid` | `boolean` | — | Filter by paid status (`true`, `false`, `1`, `0`). |
| `is_featured` / `featured` | `boolean` | — | Filter by featured status (`true`, `false`, `1`, `0`). |
| `is_system` / `system` | `boolean` | — | Filter by system/official status (`true`, `false`, `1`, `0`). |

#### Request Example

```http
GET /api/v3/widgets?page=1&limit=10&type=spotlightWidget2&featured=true HTTP/1.1
Host: api.tabsome.com
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "data": [
    {
      "id": "e4a7b2c1-9f8e-4d3c-b2a1-0f9e8d7c6b5a",
      "title": "Minimal Weather Forecast",
      "description": "5-day dynamic weather outlook widget with animated icons",
      "type": "spotlightWidget2",
      "widget": {
        "html": "<div id=\"weather-root\"></div>",
        "css": "#weather-root { font-family: sans-serif; }",
        "js": "console.log('Weather widget initialized');"
      },
      "labels": ["weather", "utility", "minimal"],
      "createdBy": "d747cfcf-eb0d-45fc-9a1c-ec5272a243fa",
      "authorName": "Alex Rivera",
      "source": "user",
      "isListed": true,
      "isFeatured": true,
      "isPaid": false,
      "isSystem": false,
      "isPublic": true,
      "isImmersive": false,
      "renderMode": "sandbox",
      "hostPermissions": ["https://api.openweathermap.org/*"],
      "createdAt": "2026-08-10T14:30:00.000Z",
      "updatedAt": "2026-08-12T09:15:00.000Z",
      "deletedAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 28,
    "totalPages": 3,
    "hasMore": true
  }
}
```

---

### 2. Get Single Widget

Retrieves the complete details and executable code payload for a specific public widget.

- **Endpoint:** `GET /api/v3/widgets/:id`
- **Authentication:** None (Public)

#### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | The unique identifier (UUID) of the widget. |

#### Request Example

```http
GET /api/v3/widgets/e4a7b2c1-9f8e-4d3c-b2a1-0f9e8d7c6b5a HTTP/1.1
Host: api.tabsome.com
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "id": "e4a7b2c1-9f8e-4d3c-b2a1-0f9e8d7c6b5a",
    "title": "Minimal Weather Forecast",
    "description": "5-day dynamic weather outlook widget with animated icons",
    "type": "spotlightWidget2",
    "widget": {
      "html": "<div id=\"weather-root\"></div>",
      "css": "#weather-root { font-family: sans-serif; }",
      "js": "console.log('Weather widget initialized');"
    },
    "labels": ["weather", "utility", "minimal"],
    "createdBy": "d747cfcf-eb0d-45fc-9a1c-ec5272a243fa",
    "authorName": "Alex Rivera",
    "source": "user",
    "isListed": true,
    "isFeatured": true,
    "isPaid": false,
    "isSystem": false,
    "isPublic": true,
    "isImmersive": false,
    "renderMode": "sandbox",
    "hostPermissions": ["https://api.openweathermap.org/*"],
    "createdAt": "2026-08-10T14:30:00.000Z",
    "updatedAt": "2026-08-12T09:15:00.000Z",
    "deletedAt": null
  }
}
```

#### Not Found Response (`404 Not Found`)

```json
{
  "success": false,
  "error": "Widget not found"
}
```

---

### 3. Create Custom Widget

Creates and shares a new custom widget. Supports both authenticated users and guest/anonymous submissions.

- **Endpoint:** `POST /api/v3/widgets`
- **Authentication:** Optional (`Authorization: Bearer <token>`)

#### Request Body (`application/json`)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `widget` | `object` \| `string` | **Yes** | — | Code bundle containing `{ html, css, js }` or raw JSON string. |
| `title` | `string` | No | `"Untitled Widget"` | Name or title of the widget. |
| `description` | `string` | No | `""` | Brief description of what the widget does. |
| `type` | `string` | No | `"spotlightWidget"` | Widget type identifier (e.g. `'spotlightWidget'`, `'spotlightWidget2'`). |
| `labels` | `string[]` | No | `[]` | Category tags / labels. |
| `is_immersive` / `isImmersive` | `boolean` | No | `false` | Enable immersive / full-width display mode. |
| `host_permissions` | `string[]` | No | `[]` | Remote URL patterns/domains required by the widget (e.g. `["https://api.github.com/*"]`). |

#### Automatic System Defaults
When created via this endpoint:
- `id`: Automatically generated unique UUID
- `source`: Set to `"user"`
- `render_mode`: Set to `"sandbox"`
- `is_public`: Set to `true` (accessible for direct sharing / embedding)
- `is_listed`: Set to `false` (unlisted from public catalog by default until approved/featured)
- `is_featured`: Set to `false`
- `is_system`: Set to `false`
- `author_name`: Inferred from user account profile (`full_name`, `name`, `display_name`, email) or `"Guest"`

#### Request Example

```http
POST /api/v3/widgets HTTP/1.1
Host: api.tabsome.com
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "title": "Crypto Price Tracker",
  "description": "Real-time BTC and ETH price tracker",
  "type": "spotlightWidget2",
  "widget": {
    "html": "<div class=\"crypto-card\"><span id=\"btc-price\">...</span></div>",
    "css": ".crypto-card { background: #1e1e2e; color: #fff; padding: 12px; border-radius: 8px; }",
    "js": "async function update() { const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'); const data = await res.json(); document.getElementById('btc-price').innerText = '$' + data.bitcoin.usd; } update();"
  },
  "labels": ["crypto", "finance", "tracker"],
  "isImmersive": false,
  "host_permissions": ["https://api.coingecko.com/*"]
}
```

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "data": {
    "id": "c3f81a92-4b7e-41d0-9d56-8a123bc45e67",
    "title": "Crypto Price Tracker",
    "description": "Real-time BTC and ETH price tracker",
    "type": "spotlightWidget2",
    "widget": {
      "html": "<div class=\"crypto-card\"><span id=\"btc-price\">...</span></div>",
      "css": ".crypto-card { background: #1e1e2e; color: #fff; padding: 12px; border-radius: 8px; }",
      "js": "async function update() { ... }"
    },
    "labels": ["crypto", "finance", "tracker"],
    "createdBy": "d747cfcf-eb0d-45fc-9a1c-ec5272a243fa",
    "authorName": "Jane Doe",
    "source": "user",
    "isListed": false,
    "isFeatured": false,
    "isPaid": false,
    "isSystem": false,
    "isPublic": true,
    "isImmersive": false,
    "renderMode": "sandbox",
    "hostPermissions": ["https://api.coingecko.com/*"],
    "createdAt": "2026-08-23T16:00:00.000Z",
    "updatedAt": "2026-08-23T16:00:00.000Z",
    "deletedAt": null
  },
  "message": "Widget created successfully"
}
```

#### Validation Error (`400 Bad Request`)

```json
{
  "success": false,
  "error": "Missing required field: widget"
}
```

---

## Client Integration Examples

### TypeScript / Fetch Client

```typescript
const BASE_URL = 'https://api.tabsome.com/api/v3/widgets';

export interface GetWidgetsFilter {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  isFeatured?: boolean;
  isPaid?: boolean;
  isSystem?: boolean;
  ids?: string[];
}

/**
 * Fetch catalog widgets with optional filtering and pagination
 */
export async function fetchWidgets(filter: GetWidgetsFilter = {}) {
  const params = new URLSearchParams();

  if (filter.page) params.set('page', filter.page.toString());
  if (filter.limit) params.set('limit', filter.limit.toString());
  if (filter.search) params.set('search', filter.search);
  if (filter.type) params.set('type', filter.type);
  if (filter.isFeatured !== undefined) params.set('featured', String(filter.isFeatured));
  if (filter.isPaid !== undefined) params.set('paid', String(filter.isPaid));
  if (filter.isSystem !== undefined) params.set('system', String(filter.isSystem));
  if (filter.ids && filter.ids.length > 0) params.set('ids', filter.ids.join(','));

  const response = await fetch(`${BASE_URL}?${params.toString()}`);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to fetch widgets');
  }

  return result;
}

/**
 * Fetch a single widget by its unique ID
 */
export async function fetchWidgetById(widgetId: string) {
  const response = await fetch(`${BASE_URL}/${widgetId}`);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Widget not found');
  }

  return result.data;
}

/**
 * Create a new user/custom widget
 */
export async function createCustomWidget(
  widgetData: {
    title: string;
    description?: string;
    type?: string;
    widget: { html: string; css: string; js: string } | string;
    labels?: string[];
    isImmersive?: boolean;
    hostPermissions?: string[];
  },
  authToken?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: widgetData.title,
      description: widgetData.description,
      type: widgetData.type || 'spotlightWidget2',
      widget: widgetData.widget,
      labels: widgetData.labels || [],
      is_immersive: widgetData.isImmersive,
      host_permissions: widgetData.hostPermissions || []
    })
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to create widget');
  }

  return result.data;
}
```

---

## Error Handling & Response Format

All responses adhere to the standard API response structure:

```json
{
  "success": false,
  "error": "Human readable error message",
  "data": null
}
```

### Common HTTP Status Codes

| HTTP Status | Meaning | Typical Scenario |
|---|---|---|
| `200 OK` | Request succeeded | `GET /api/v3/widgets`, `GET /api/v3/widgets/:id` |
| `201 Created` | Resource created | `POST /api/v3/widgets` |
| `400 Bad Request` | Invalid payload or missing fields | Missing `widget` payload during creation |
| `404 Not Found` | Resource not found | Requesting a non-existent or deleted `id` |
| `500 Internal Server Error` | Server or database error | Database query failure or unexpected error |
