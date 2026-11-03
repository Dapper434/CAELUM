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


## Admin user management (not live yet)

The console's Users page targets these endpoints, which the API does not serve yet. Until they ship, the page shows the API's error (likely 404).

- `GET /api/v1/admin/users`: assumed to page with `limit` and `offset` query params (page size 50) and to return the usual `{data, meta}` envelope. The client reads `meta.has_more`, or `meta.total` with `meta.offset`, and otherwise treats a full page as "there may be more". It also sends an optional `role` filter. Rows are assumed to carry `user_id, email, role, full_name, facility_id, facility_name, courier_id, last_sign_in_at, confirmed`. Please confirm or tell us the real paging params.
- `POST /api/v1/admin/users/invite`: body `{email, role, full_name, facility_id?, courier_id?}`. The console sends `facility_id` only for donor and recipient, and `courier_id` only for courier. Returns 201; 409 means the email is already registered; 400 errors should use the standard `{error: {code, message}}` shape, because the console shows `message` as is.
- `POST /api/v1/admin/users/{id}/resend-invite` and `POST /api/v1/admin/users/{id}/disable`: assumed to take an empty JSON body and to return 2xx. The console reloads the list afterwards and doesn't depend on the response body.
- The API sets each invite's redirect per role on the server: admin to caelum-console, donor and recipient to caelum-facility, courier to caelum-courier, each at `/reset-password`. The console sends no redirect in the invite request. The console's forgot-password link uses `<origin>/reset-password`, so `https://caelum-console.vercel.app/reset-password` must be in Supabase Auth's allowed redirect URLs.
