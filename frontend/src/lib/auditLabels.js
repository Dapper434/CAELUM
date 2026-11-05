/** Plain-English labels for audit action strings. Unknown actions are humanized. */

const LABELS = {
  'request.created': 'Request created',
  'request.confirmed': 'Request confirmed',
  'request.cancelled': 'Request cancelled',
  'request.dismissed': 'Request dismissed',
  'offer.created': 'Offer sent',
  'offer.held': 'Offer held',
  'offer.accepted': 'Offer accepted',
  'offer.declined': 'Offer declined',
  'offer.expired': 'Offer expired',
  'transfer.created': 'Transfer created',
  'transfer.packed': 'Transfer packed',
  'transfer.courier_assigned': 'Courier assigned',
  'transfer.courier_accepted': 'Courier accepted the job',
  'transfer.courier_declined': 'Courier declined the job',
  'transfer.courier_timeout': 'Courier did not accept in time',
  'transfer.in_transit': 'Transfer in transit',
  'transfer.arrived': 'Transfer arrived',
  'transfer.delivered': 'Transfer delivered',
  'transfer.cancelled': 'Transfer cancelled',
  'transfer.pack_timeout': 'Pack window timed out',
  'transfer.receipt_confirmed': 'Receipt confirmed',
  'custody.pack_seal': 'Pack seal recorded',
  'custody.pickup': 'Pickup scanned',
  'custody.pickup_rejected': 'Pickup rejected',
  'custody.handover': 'Handover completed',
  'custody.handover_rejected': 'Handover rejected',
  'custody.seal_check': 'Seal checked',
  'custody.photo_attached': 'Custody photo attached',
  'custody.qr_reissued': 'Pickup QR reissued',
  'temperature.excursion': 'Cold-chain excursion',
  'temperature.cabin_warning': 'Cabin temperature warning',
  'inventory.added': 'Stock added',
  'inventory.status': 'Stock status changed',
  'inventory.corrected': 'Stock corrected',
  'courier.created': 'Courier created',
  'courier.updated': 'Courier updated',
  'courier.push_token_registered': 'Courier push token registered',
  'facility.contact_updated': 'Facility contact updated',
  'user.invited': 'User invited',
  'user.invite_resent': 'Invite resent',
  'user.disabled': 'User disabled',
  'policy.ingested': 'Policy ingested',
};

const IMPORTANT = new Set([
  'temperature.excursion', 'temperature.cabin_warning',
  'transfer.courier_timeout', 'transfer.pack_timeout', 'transfer.courier_declined', 'transfer.cancelled',
  'offer.declined', 'inventory.corrected', 'user.disabled', 'user.invited', 'user.invite_resent',
  'custody.qr_reissued', 'custody.pickup_rejected', 'custody.handover_rejected',
]);

const CATEGORY_LABELS = {
  forecast: 'Forecast / suggestions',
  requests: 'Requests',
  offers: 'Offers',
  transfers: 'Transfers',
  custody: 'Custody',
  temperature: 'Cold chain',
  inventory: 'Inventory',
  users: 'Users',
  couriers: 'Couriers',
  facilities: 'Facilities',
  policies: 'Policies',
  other: 'Other',
};

export function actionLabel(action) {
  if (!action) return '—';
  if (LABELS[action]) return LABELS[action];
  return String(action).replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isImportantAction(action) {
  return IMPORTANT.has(action);
}

export function categoryLabel(cat) {
  return CATEGORY_LABELS[cat] || String(cat || 'other');
}

/**
 * Collapse consecutive same-action rows into groups for display.
 * Returns [{ kind:'single', entry } | { kind:'group', action, count, first, last, entries }]
 */
export function groupConsecutive(entries = []) {
  const out = [];
  for (const entry of entries) {
    const prev = out[out.length - 1];
    if (prev && prev.kind === 'group' && prev.action === entry.action) {
      prev.entries.push(entry);
      prev.count += 1;
      prev.last = entry;
      continue;
    }
    if (prev && prev.kind === 'single' && prev.entry.action === entry.action) {
      out[out.length - 1] = {
        kind: 'group',
        action: entry.action,
        count: 2,
        first: prev.entry,
        last: entry,
        entries: [prev.entry, entry],
      };
      continue;
    }
    out.push({ kind: 'single', entry });
  }
  // Only keep groups of 3+ as collapsed; pairs stay expanded for clarity
  return out.map((item) => {
    if (item.kind === 'group' && item.count < 3) {
      return item.entries.map((e) => ({ kind: 'single', entry: e }));
    }
    return [item];
  }).flat();
}
