# Admin User Guide

Sign in at **`/admin/login`**. Everything on the public site is edited here — no code changes or rebuilds. Saved changes appear on the next page load.

## First steps

1. Sign in with the account created by `python -m app.cli create-admin`.
2. **Security → Set up two-factor**: add the key to an authenticator app and confirm with a code. Next time you sign in you will be asked for the 6-digit code.
3. **Profile**: check your name, headline, bio, contact details and profile picture.

## Roles

| Role | Can |
|---|---|
| Super Admin | Everything, including users, audit log and lead export |
| Editor | Create, edit and delete all content; view and update leads. Cannot manage users, export leads or see the audit log |
| Viewer | Read-only access to content (no enquiries / personal data) |

Invite people under **Users → Invite user**. They receive a one-time link (valid 72 hours) to set their own password. If email is not configured, copy the link shown and send it yourself.

## Projects

**Projects → New project**

- *Title* and *Summary* are shown on cards; the slug (URL) is generated from the title if left empty.
- *Status*: **Draft** is private, **Published** is live. *Featured* puts it in the featured reel on the homepage. *Display order*: lower numbers first.
- *Client project* shows a "Client project" badge; *Demo / MVP* shows a "Demo" badge.
- *Cover image* and *Screenshots*: choose from the media library or upload directly in the picker. Add captions; reorder with the arrows.
- *Technologies* and *Main features*: one per line.
- *Case study* sections (Overview, Architecture, Contribution, Challenges, Solutions, Outcomes) support Markdown — use the **Preview** tab. Empty sections are hidden.
- Only add facts you can stand behind: timelines, metrics and outcomes should be verifiable.

Use **View on site** to open the public page. Deleting moves a project to the bin — tick *Show deleted* in the list to restore it.

## Services

Same workflow. *Status = Active* publishes it. *Starting price* is optional — leave it empty to show "quote on request". *Icon* is chosen from a fixed list. The public page has a **Request a quote** button that pre-selects the service on the contact form.

## Client testimonials

A testimonial is public only when **all three** are true: *Approval status = Approved*, *Client consent* is ticked, *Published* is ticked.

- **Adding one yourself:** use the client's real words, and only after they agreed to publication. Link it to a project so it also shows on that project's page.
- **From the website:** visitors can submit via the form on the Contact page. These arrive as *Pending* with source "Website form" and the submitter's email (never shown publicly). Review, confirm consent with the client, then approve and publish — or set *Rejected*.
- Setting a testimonial back to Pending or Rejected removes it from the site immediately.
- Never create or edit a review to say something the client did not say.

## Blog

Write in Markdown with a live preview. *Status = Published* with an empty date publishes now; a **future publish date schedules** the article (it appears automatically at that time). Tags are created as you type them (one per line). Set an SEO title/description for search results; use *Canonical URL* only for articles first published elsewhere.

## Homepage

**Homepage** lists each section (hero, about, services, projects, testimonials, process, why_me, skills, contact_cta). Change headings and text, hide a section with *Visible*, and change the order with *Order*. The *Structured content* field holds lists such as hero buttons, about pillars or process steps, as JSON — keep the same shape as the existing value.

## Contact leads

New enquiries appear here (and are emailed to you if SMTP is configured). Open one to:

- set the pipeline status: New → Contacted → In discussion → Converted / Closed,
- set a follow-up date (filter the list by it),
- add private notes,
- reply by email or phone.

**Export CSV** (Super Admin) asks for your password again and is recorded in the audit log. The file contains personal data — store it securely and delete it when no longer needed.

## Media library

Upload JPEG, PNG, WebP or GIF images (≤ 5 MB) and PDFs (≤ 10 MB) — drag and drop works. Files are checked, re-encoded (location data removed) and stored under random names. Add *alt text* to every image. A file that is still used (cover, gallery, resume, settings) cannot be deleted until you remove it there.

## Resume

Upload the PDF in the media library, then **Resume → New resume**, choose the file and tick *Active*. Every "Download Resume" button uses the active one.

## Skills, Experience, Categories, Navigation, Social links, SEO

- **Skills**: grouped by category; untick *Enabled* to hide one. There are no percentage bars by design.
- **Experience**: work, education and achievements on the About page — add only verified history.
- **Categories**: project categories (filters on /projects), skill categories, blog categories and tags.
- **Navigation**: header and footer links (`/path`, `#section`, `https://…`, `mailto:`).
- **SEO**: title, description, share image and *noindex* for the main pages.

## Website settings

Calls to action, budget options for the contact form, testimonial form on/off, footer text, public site URL (used for canonical links and the sitemap), default SEO text and share image. **Secrets are never here** — SMTP, Cloudinary and keys are environment variables on Railway.

## Security

- Sessions last up to 7 days of activity; access tokens renew automatically every 15 minutes.
- Sensitive actions (exports, user changes, 2FA changes) ask for your password again.
- After 5 wrong passwords an account locks for 15 minutes (a Super Admin can unlock it under Users).
- **Security → Signed-in devices** shows every session; sign out individual devices or everywhere.
- Forgot your password? Use *Forgot your password?* on the sign-in page (works for verified emails). If you lose your authenticator, another Super Admin can reset your 2FA; if you are the only one, run `python -m app.cli create-admin --force-additional` for a recovery account and reset it from there.
- **Audit logs** list every sign-in, change, export and security event.
