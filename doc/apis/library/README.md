# Library API Documentation (v3)

The TabSome Library system provides a polymorphic bookmark and note-taking platform with multi-collection support, nested folder hierarchies, many-to-many tagging, collaborative sharing, and bidirectional cursor-based offline synchronization.

---

## Documentation Sections

1. **[Library Schema & Database Spec](../../library-schema.md)**
   - Normalized 7-table Supabase/PostgreSQL schema (`library_collections`, `library_folders`, `library_items`, `library_tags`, `library_item_tags`, `library_collection_shares`, `library_changes`).
   - IndexedDB object store structures for the TabSome browser extension.
   - Entity-Relationship diagram and Row-Level Security (RLS) policies.

2. **[Bidirectional Cursor Sync API](sync/sync_doc.md)**
   - `GET /api/v3/users/me/library/sync` — Sync state discovery (initialization, primary collection info, cursor, active item count).
   - `POST /api/v3/users/me/library/sync` — Bidirectional sync protocol with atomic changesets, upsert reconciliation, soft-delete cascades, and conflict resolution.

3. **[User-Scoped REST CRUD API](user_library.md)**
   - `Collections`: CRUD endpoints (`/api/v3/users/me/library/collections`).
   - `Folders`: Tree hierarchy management (`/api/v3/users/me/library/collections/:id/folders`).
   - `Items`: Polymorphic links and notes CRUD, bulk operations, and tag reconciliation (`/api/v3/users/me/library/collections/:id/items`).
   - `Tags`: User-scoped tagging and collection filtering (`/api/v3/users/me/library/collections/:id/tags`).
   - `Sharing`: Access grants for public links and collaborator permissions (`/api/v3/users/me/library/collections/:id/shares`).

4. **[Public & Shared Collections API](public.md)**
   - `GET /api/v3/library/collections` — System-provided public collections with aggregate stats.
   - `GET /api/v3/library/collections/:id` — Public collection content view.
   - `GET /api/v3/library/collections/demo` — Default public demo collection.
   - `GET /api/v3/shared/library/:shareToken` — Resolving public share links.
