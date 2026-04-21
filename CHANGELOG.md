# Changelog

## v1.2.0 — 2026-04-21

### Added (40 new tools, 93 total)
- **Services** (7): `tt_list_services`, `tt_get_service`, `tt_create_service`, `tt_update_service`, `tt_archive_service`, `tt_reactivate_service`, `tt_delete_service`
- **Event Tags** (8): `tt_list_tags`, `tt_get_tag`, `tt_list_tag_values`, `tt_create_tag`, `tt_update_tag`, `tt_delete_tag`, `tt_save_event_tag`, `tt_delete_event_tag`
- **User Groups** (5): `tt_list_user_groups`, `tt_get_user_group`, `tt_create_user_group`, `tt_update_user_group`, `tt_delete_user_group`
- **Teams/Workspaces** (3): `tt_list_teams`, `tt_switch_team`, `tt_update_team_permissions`
- **Reports** (1): `tt_get_user_report`
- **Notifications** (3): `tt_list_notifications`, `tt_mark_notification_read`, `tt_mark_notifications_read`
- **Webhooks** (6): `tt_list_webhooks`, `tt_get_webhook`, `tt_enable_webhook`, `tt_disable_webhook`, `tt_reset_webhook_token`, `tt_delete_webhook`
- **Time Entries extras** (2): `tt_list_time_entries_min`, `tt_count_time_entries`
- **User extras** (5): `tt_create_user`, `tt_resend_invite`, `tt_reset_icalendar_token`, `tt_update_user_permissions`, `tt_update_employee`

### Fixed
- `tt_invite_users` replaced with `tt_create_user` — the `/users/invite` endpoint returns 400 "doesn't exist"; the working endpoint is `POST /users/add`
- `tt_get_project_times` / `tt_get_task_times` / `tt_search_tasks` / `tt_sort_tasks` / `tt_assign_user_projects` / `tt_remove_user_projects` / `tt_import_tasks` / `tt_create_task` / `tt_update_task` — v1.1.1 over-applied `JSON.stringify` to array body fields, which caused 500 errors on these JSON endpoints. Reverted to raw arrays. Only `/events/billed` and `/events/not_billed` genuinely require stringified arrays (legacy handler treats `data` as a String).
- `tt_archive_user` / `tt_reactivate_user` / `tt_archive_customer` / `tt_reactivate_customer` — switched from POST to PUT. The POST variants silently returned an HTML error page instead of applying the change.

### Notes
- All 93 tools verified live against the TrackingTime API v4 with round-trip create/read/update/delete smoke tests.
- User groups do not have separate close/open endpoints — archive via `tt_update_user_group` with `status: "ARCHIVED"`.

## v1.1.1 — 2026-02-12
- Attempted fix for array params causing 500 errors (over-applied — see v1.2.0 fix notes).

## v1.1.0 — 2026-02-11
- Activated all 54 tools, `npx` install documented.

## v1.0.1 — 2026-02-10
- Added GitHub Actions trusted publishing to npm (no tokens).
- Release scripts for one-command publishing.
