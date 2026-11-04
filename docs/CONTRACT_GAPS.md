# Admin console ↔ CAELUM API contract gaps

Measured against `CAELUM_API/docs/API_CONTRACT.md` v1.2.0 and the live API (v1.2.3 on Render). Nothing here is faked in the
console: each gap is either left out or worked around in the open, as described.

| # | Gap | What the console does now | Suggested API change |
|---|-----|---------------------------|----------------------|
| 1 | `GET /audit` has `after_seq` but no `before_seq`, so older pages of the global log can't be fetched past the newest 500. | Fetches the newest 100/200/500 (with filters) and pages them in the browser. The page says "newest N only" when the limit is hit. Per-facility audit uses `/facilities/{id}/audit` with `before_seq` paging. | Add `before_seq` and `meta.next_before_seq` to `/audit`, as on `/facilities/{id}/audit`. |
| 2 | No admin job-history endpoint for a courier (`/couriers/{id}/jobs`), and `GET /transfers` has no `courier_id` filter. History exists only for the courier at `/couriers/me`. | Job history is derived in the browser by filtering `GET /transfers` on `courier_id`. It shows only the courier's current assignment per transfer; earlier declined or timed-out assignments that were reassigned don't show (only `last_declined_courier_id`). | Add `GET /couriers/{id}/jobs` (admin) or a `courier_id` filter on `/transfers`. |
| 3 | No `GET /couriers/{id}`. | The courier detail is taken from the `GET /couriers` list row. | Add `GET /couriers/{id}`. |
| 4 | QR payload is not served to admins (by design: only the donor facility renders it). | The custody panel shows QR status and expiry from `GET /transfers/{id}/qr` but not the code itself. | None; by design. |
| 5 | No per-unit history endpoint for inventory corrections. | Corrections are read from the audit log with `action=inventory.corrected` and `entity_type=unit`. | Optional: `GET /inventory/{unit_id}/history`. |
| 6 | SMS notifications (Africa's Talking) are on hold. | Nothing is built for SMS. | — |
| 7 | `POST /auth/demo-login` (and `/auth/demo-users`) return `404` on the live API (v1.2.3); demo accounts are now real Supabase users. Contract §5.1 still lists them. | Removed. Sign-in is always Supabase `signInWithPassword`; the access token goes to the API as `Bearer`. With `VITE_DEMO_MODE=true` the sign-in page can prefill `admin@caelum.demo`, never a password. | Update the contract to drop demo-login for deployed stores. |
| 8 | ~~Live API sent no CORS headers.~~ Resolved: DAPPER verified on 3 Nov 2026 (with an `Origin` header) that Render allows `https://caelum-console.vercel.app`. | None for production. | If local dev is blocked, add `http://localhost:5173` to `CORS_ORIGINS` on Render. |


## Admin user management (contract v1.3.0, §5.12)

- Resolved under v1.3.0: paging. `GET /admin/users` uses `page` and `per_page` (1–200, default 50) with `meta {page, per_page, count, has_more, next_page}` and no total. The console asks for 50 per page and uses `has_more` and `next_page` for "Load more". There's no role filter in the contract, so the console doesn't send one.
- Resolved under v1.3.0: the error shape. Errors are `{error: {code, message}}`. The console handles `403` (not an admin) on all four endpoints, invite `400` (shows the server's message) and `409 email_exists`, and resend `404` (unknown user) and `409 already_confirmed`.
- Users carry `status: invited|confirmed|disabled`; there's no `confirmed` flag. Resend shows only for `invited` users, and Disable only when the user isn't disabled.
- A courier invite without `courier_id` is valid, because the server creates and links a courier row.
- The API sets each invite's redirect per role on the server: admin to caelum-console, donor and recipient to caelum-facility, courier to caelum-courier, each at `/reset-password`. The console sends no `redirect_to`. The console's forgot-password link uses `<origin>/reset-password`, so `https://caelum-console.vercel.app/reset-password` must be in Supabase Auth's allowed redirect URLs.
- Still open: whether these endpoints are deployed on Render. Until they are, the page shows the API's error.

## Forecast runs (contract v1.4.0)

- `POST /forecast/run` is async. The console treats `202` (new job) and `200` (same-scope job already queued or running) the same way: it keeps `job_id` and polls `GET /forecast/runs/{job_id}` every 3 s, showing "x/y facilities", until the job succeeds or fails. A `404` while polling stops with a message. On success it reloads the alerts list and the overview counts; the Requests page loads fresh when opened.
- Job ids aren't saved across a page reload, so if the admin reloads mid-run the progress is lost. Clicking Run again returns the same job (`200`), so polling picks it up again.
- The shared client leaves out `undefined`, `null`, `''`, `'null'` and `'undefined'` from query strings, and the same strings from JSON bodies. A real JSON `null` in a body is kept, because `PATCH /facilities/{id}` uses it to clear a contact field. The contract also lists `"none"` and `"nan"` as placeholders; the client doesn't strip those strings, because they could be real text in a free-text field.
