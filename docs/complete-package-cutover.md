# Complete Package Cutover Notes

## Canonical map model

The app now uses a single canonical map domain:

- `MapRuntimeConfig`
- `PlayerLocation`
- `MapPin`
- `MapRoute`
- `MapOverlay`
- `MapBroadcast`

`ClanMap` is now an alias of `TacticalMap`, so the old dual-map runtime path is removed from frontend routing.

## Privileged map writes

Privileged tactical map writes are executed through `mutateMapDomain`:

- `create_pin`
- `update_pin`
- `delete_pin`
- `create_route`
- `create_broadcast`
- `upsert_overlay`
- `delete_overlay`
- `reset_domain`

Role policy:

- admin users: allowed
- officer/lieutenant/commander clan roles: allowed
- all others: forbidden

All writes support `dry_run` and idempotency keys.

## Tactical map UI coverage

`TacticalMap` now includes first-class workflows for all map-domain tactical actions:

- pin placement/update/delete
- route drafting and save
- broadcast creation
- overlay create/delete

All tactical mutation controls are visible in context and locked for non-permitted roles.
Map sync state is surfaced with shared live-state semantics (`source`, `retrieved_at`, stale age badges, retrying).

## Canonical reset

Use `mutateMapDomain` with:

- `action: "reset_domain"`
- `dry_run: true` to preview counts
- `dry_run: false` + `confirm_token: "RESET"` to execute

`reset_domain` also purges legacy map entities (`ClanPosition`, `TacticalOverlay`, `ClanBroadcast`) when present.
