# Brandsquare CRM

A small CRM for the leads captured by the **Brandsquare Quote Form** WordPress plugin.

The dashboard never touches MySQL. On Hostinger shared hosting the database is bound to
`127.0.0.1`, so everything goes through a REST API in the plugin over HTTPS. Nothing about
the database is exposed to the internet, and the dashboard can be deployed anywhere —
including Vercel, which has no fixed outbound IP.

Auth is entirely separate from WordPress. Dashboard accounts live in `wp_bsq_users`;
nobody signs in with a WordPress login.

## Setup

**1. In WordPress**

Upload and activate `brandsquare-quote-form.php`, then go to **Brandsquare → Dashboard
Access**. It shows the two values you need and lets you create the first admin account.

If the API returns 404, go to **Settings → Permalinks** and click Save once — WordPress
needs to flush its rewrite rules before `/wp-json/` routes resolve.

**2. Here**

```bash
cp .env.example .env.local     # paste the URL and key from that screen
npm install
npm run check-api
```

`check-api` confirms the dashboard can reach WordPress, that the key is accepted, and
that an admin exists. It names the likely cause for each failure. Run it before anything
else.

```bash
npm run dev
```

Sign in with the admin you created in step 1.

## How sub-admins work

1. An admin opens **Team** and creates one with a name and email.
2. The plugin writes an `invited` account, a temporary password and a one-time token in a
   single call, so a half-created user can't be left behind.
3. They get an email with their address, that temporary password and a link.
4. They open the link, set their own password, and the account becomes `active`.
5. Only then do they start receiving auto-assigned leads — assigning to someone who
   can't yet log in would hide the lead from everybody.

Leave `SMTP_HOST` empty in development and the invite is printed to the server console
instead of being emailed, so the flow is still testable.

## Access rules

Scope is enforced server-side, never by hiding rows in the UI:

- **Admin** — every lead, can reassign, can manage the team.
- **Sub-admin** — only leads assigned to them. Their id is sent as the scope and the
  plugin puts it in the `WHERE` clause, so a forged lead id in the URL returns 404.

Passwords are verified in PHP and never cross the network; the dashboard only ever holds
an opaque session token. Sessions live in `wp_bsq_sessions`, so disabling someone drops
every one of their sessions immediately rather than waiting for a token to lapse.

## Layout

```
src/lib/api.ts       REST client — the only place that knows how WordPress is reached
src/lib/queries.ts   every data operation the app performs
src/lib/auth.ts      login, session cookie, invites
src/lib/mailer.ts    invite email
src/app/actions/     server actions (login, leads, team)
src/app/(dash)/      dashboard, leads, team — auth-guarded by the layout
```

`api.ts` and `queries.ts` are the seam. If the database ever becomes directly reachable —
a VPS, or Remote MySQL with a fixed IP — only those two files change.

## Deploying to Vercel

Set `WP_API_URL`, `WP_API_KEY`, `APP_URL` and the `SMTP_*` values as environment
variables. Nothing else is needed; there is no database connection to configure.

Set `APP_URL` to the deployed URL, otherwise invite links will point at localhost.

## Status

Verified against a mock of the plugin's API: login, session handling, lead list and
detail, notes, activity, team management, invite accept and reject, plus sub-admin
scoping (a sub-admin requesting another owner's lead gets a 404, and `/team` redirects
them away).

**Not yet run against live WordPress.** The PHP endpoints are written and structurally
checked but have never executed — there was no PHP runtime available while building.
`npm run check-api` is the fastest way to shake out the first real run.
