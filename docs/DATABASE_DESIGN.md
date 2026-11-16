# Database Design (PostgreSQL 17)

Conventions: UUID primary keys (`gen_random_uuid()` not required — generated in Python), `created_at`/`updated_at` (timestamptz, UTC) on every table, `deleted_at` soft delete on content people may want back (projects, services, blog posts, testimonials, leads, media). Slugs are unique among non-deleted rows (partial unique index). All schema changes go through Alembic; `create_all()` is used only inside the test fixture for speed **after** a separate test proves `alembic upgrade head` builds the same schema.

## Identity & access

| Table | Key columns | Notes |
|---|---|---|
| `users` | email (unique, lower-cased), password_hash (Argon2id), full_name, is_active, email_verified_at, failed_login_count, locked_until, last_login_at, token_version, mfa_enabled, mfa_secret_enc | No public registration. `token_version` bump = all sessions invalid. |
| `roles` | name (unique: `super_admin`, `editor`, `viewer`), description | Seeded by migration. |
| `permissions` | code (unique, e.g. `projects:write`) | Seeded by migration. |
| `role_permissions` | role_id, permission_id (PK pair) | CASCADE on role/permission delete. |
| `user_roles` | user_id, role_id (PK pair) | CASCADE on user delete. |
| `refresh_tokens` | user_id, family_id, token_hash (unique, SHA-256), expires_at, revoked_at, replaced_by_id, reauth_at, ip, user_agent | Rotation + reuse detection by family. |
| `auth_tokens` | user_id, purpose (`password_reset` / `invite`), token_hash (unique), expires_at, used_at | One-time, hashed. |
| `audit_logs` | actor_user_id (SET NULL), action, entity_type, entity_id, ip, user_agent, details JSONB, created_at | Append-only; indexed on created_at, actor, entity. |

## Content

| Table | Key columns | Relations |
|---|---|---|
| `project_categories` | name, slug (unique), position | |
| `projects` | title, slug, tagline, summary, overview/challenges/solutions/outcomes/contribution/architecture (markdown), features JSONB, timeline, client_name, is_client_project, is_demo, live_url, github_url, video_url, highlight_label/value, cover_url, featured, status, position, seo_title, seo_description, published_at | category_id → project_categories (SET NULL) |
| `project_technologies` | project_id, name, position | CASCADE with project |
| `project_media` | project_id, media_id, caption, position | CASCADE with project; media RESTRICT (can't delete an image in use) |
| `services` | title, slug, summary, content (md), features JSONB, tech_stack JSONB, icon, cover_url, starting_price (numeric, nullable), price_currency, price_note, delivery_estimate, featured, status, position, seo_* | |
| `skill_categories` | name, slug (unique), position | |
| `skills` | name, icon, color, position, featured, is_active, is_learning, note | category_id → skill_categories (RESTRICT); unique (category_id, name) |
| `testimonials` | client_name, company, designation, content, rating (1–5, CHECK), testimonial_date, avatar_url, featured, approval_status (`pending`/`approved`/`rejected`), is_published, source (`admin`/`public_form`), submitter_email, consent_confirmed | project_id → projects (SET NULL) |
| `blog_categories` | name, slug (unique) | |
| `blog_tags` | name, slug (unique) | |
| `blog_posts` | title, slug, excerpt, content (md), cover_url, status (`draft`/`published`), published_at (future = scheduled), reading_minutes, seo_title, seo_description, canonical_url | category_id (SET NULL), author_id → users (SET NULL) |
| `blog_post_tags` | post_id, tag_id (PK pair) | CASCADE both sides |
| `experiences` | kind (`work`/`education`/`achievement`), title, organization, location, start_date, end_date, is_current, description, highlights JSONB, position, is_visible | |
| `homepage_sections` | key (unique), title, subtitle, body, data JSONB, position, is_visible | |
| `navigation_items` | label, href, location (`header`/`footer`), position, is_visible, open_in_new_tab | |
| `social_links` | platform, label, url, icon, position, is_visible | |
| `seo_metadata` | page_key (unique), title, description, og_image_url, canonical_path, noindex | Static pages; entities carry their own SEO columns. |
| `site_settings` | key (unique), value JSONB | Whitelisted keys only, validated by a typed schema. **Never holds secrets.** |

## Leads

| Table | Key columns | Relations |
|---|---|---|
| `contact_leads` | name, email, phone, company, service_label, budget, message, preferred_contact, status (`new`/`contacted`/`in_discussion`/`converted`/`closed`), follow_up_at, source, ip_hash (HMAC, not the raw IP), user_agent | service_id → services (SET NULL); indexes on status, created_at, email |
| `lead_notes` | body | lead_id CASCADE, author_id SET NULL |

## Media

| Table | Key columns |
|---|---|
| `media_assets` | provider (`cloudinary`/`local`/`static`), storage_key (unique), url, kind (`image`/`document`), mime_type, size_bytes, width, height, original_filename (display only), alt_text, uploaded_by (SET NULL) |
| `resume_files` | media_id → media_assets (RESTRICT), label, is_active (partial unique index: at most one active) |

Files themselves live in Cloudinary (or a local dev folder); PostgreSQL stores metadata only.

## Migration strategy

1. `0001_initial` creates every table, index and constraint, and seeds roles + permissions (reference data, required for the app to work).
2. Content is **not** in migrations. `python -m app.cli seed` loads the migrated portfolio content (idempotent: skips existing slugs).
3. Production: back up → `alembic upgrade head` → deploy → `/ready`. Every migration has a `downgrade`.

## Backup / restore (summary — full steps in DEPLOYMENT_GUIDE.md)

```
pg_dump --format=custom --no-owner "$DATABASE_URL" > portfolio-$(date +%F).dump
pg_restore --clean --if-exists --no-owner -d "$TARGET_DATABASE_URL" portfolio-YYYY-MM-DD.dump
```
