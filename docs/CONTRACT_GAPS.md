# Admin console ↔ CAELUM API contract gaps

Measured against `CAELUM_API/docs/API_CONTRACT.md` v1.2.0. Nothing here is faked in the
console: each gap is either left out or worked around in the open, as described.

| # | Gap | What the console does now | Suggested API change |
|---|-----|---------------------------|----------------------|
| 1 | `GET /audit` has `after_seq` but no `before_seq`, so older pages of the global log can't be fetched past the newest 500. | Fetches the newest 100/200/500 (with filters) and pages them in the browser. The page says "newest N only" when the limit is hit. Per-facility audit uses `/facilities/{id}/audit` with `before_seq` paging. | Add `before_seq` and `meta.next_before_seq` to `/audit`, as on `/facilities/{id}/audit`. |
| 2 | No admin job-history endpoint for a courier (`/couriers/{id}/jobs`), and `GET /transfers` has no `courier_id` filter. History exists only for the courier at `/couriers/me`. | Job history is derived in the browser by filtering `GET /transfers` on `courier_id`. It shows only the courier's current assignment per transfer; earlier declined or timed-out assignments that were reassigned don't show (only `last_declined_courier_id`). | Add `GET /couriers/{id}/jobs` (admin) or a `courier_id` filter on `/transfers`. |
| 3 | No `GET /couriers/{id}`. | The courier detail is taken from the `GET /couriers` list row. | Add `GET /couriers/{id}`. |
| 4 | QR payload is not served to admins (by design: only the donor facility renders it). | The custody panel shows QR status and expiry from `GET /transfers/{id}/qr` but not the code itself. | None; by design. |
| 5 | No per-unit history endpoint for inventory corrections. | Corrections are read from the audit log with `action=inventory.corrected` and `entity_type=unit`. | Optional: `GET /inventory/{unit_id}/history`. |
| 6 | SMS notifications (Africa's Talking) are on hold. | Nothing is built for SMS. | — |
