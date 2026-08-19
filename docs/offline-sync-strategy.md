# Offline and Synchronization Strategy

## Operating model

The clinic system should continue serving a branch during a temporary internet outage, while treating the central database as the source of truth once connectivity returns. A browser-only cache is not sufficient for confidential medical data or for reliable cross-branch synchronization. The production offline mode therefore requires a local branch gateway or managed local replica with encrypted storage, authenticated devices, and a controlled outbound sync channel.

## Data tiers

| Data | Offline policy | Conflict policy |
|---|---|---|
| Patient identity and contact data | Read cached records and create updates locally | Patient identity conflicts require review; never silently merge records |
| Appointments | Read cached schedules and create bookings against locally reserved slots | Server wins for conflicting slots; local booking becomes conflict state and is never silently discarded |
| Medical visits and attachments | Write encrypted local records and queue uploads | Append-only visit records; attachment upload retries by content hash |
| Payments | Allow queued payment capture only with a local receipt sequence and cashier confirmation | Never retry a payment without an idempotency key; reconciliation is required when totals differ |
| Reports | Show cached “last updated” reports only | Reports refresh after synchronization; cached reports are labelled stale |

## Stable identity and retry contract

Every offline-created operation must carry a client-generated operation identifier, creation timestamp, originating branch identifier, originating device identifier, and schema version. Server mutations must treat the operation identifier as idempotent: a retry returns the original result rather than inserting a second patient, appointment, visit, payment, or receipt. Attachments use a content hash and a resumable upload state.

## Synchronization lifecycle

A branch gateway maintains `pending`, `sending`, `accepted`, `conflict`, and `failed` operation states. Synchronization is ordered by dependency: patients before appointments, appointments before visits, and invoices/payments before receipts. The service retries transient network failures with bounded exponential backoff, but it never retries a rejected validation or permission error automatically. A supervisor resolves conflicts from a review queue, and all resolutions are audit logged.

## Security and deployment boundary

The current managed web preview is online-first and does not claim to provide true branch operation without connectivity. Before production offline deployment, each branch needs an approved local gateway or persistent hosting topology, encrypted local storage, device registration, backup/restore procedures, and a connectivity test plan. Until that infrastructure is selected, the application should expose connection state and preserve unsent form drafts only; it must not pretend that browser cache alone is a safe multi-branch medical record replica.
