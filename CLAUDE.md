# TrackingTime MCP Server

MCP server for managing TrackingTime via AI assistants (Claude Code, Claude Desktop).

## What to Build
- MCP server using `@modelcontextprotocol/sdk` (TypeScript, stdio transport)
- Wraps the TrackingTime REST API v4
- Auth via .env: `TT_EMAIL`, `TT_PASSWORD`, `TT_ACCOUNT_ID`

## Required Tools

| Tool | API Endpoint | Method |
|------|-------------|--------|
| `list_projects` | `/projects` | GET |
| `search_projects` | `/projects/search` | GET |
| `create_project` | `/projects/add` | POST |
| `archive_project` | `/projects/close/:id` | PUT |
| `list_tasks` | `/tasks` | GET |
| `create_task` | `/tasks/share` | POST |
| `update_task` | `/tasks/update/:id` | PUT |
| `close_task` | `/tasks/close/:id` | PUT |
| `start_timer` | `/tasks/track/:id` | POST |
| `stop_timer` | `/tasks/stop/:id` | POST |
| `list_time_entries` | `/events` | GET |
| `add_time_entry` | `/events/add` | POST |
| `get_events_summary` | `/events/summary` | GET |
| `list_customers` | `/customers` | GET |

## Nice-to-Have Tools

| Tool | API Endpoint | Method |
|------|-------------|--------|
| `get_project` | `/projects/:id` | GET |
| `update_project` | `/projects/update/:id` | PUT |
| `delete_task` | `/tasks/delete/:id` | DELETE |
| `update_time_entry` | `/events/update/:id` | PUT |
| `delete_time_entry` | `/events/delete/:id` | DELETE |
| `export_time_entries` | `/events/export` | GET |
| `mark_billed` | `/events/billed` | PUT |

---

# TrackingTime API v4 Reference

Full docs: https://api.trackingtime.co/doc/index.html

## Base URL & Auth
```
Base URL:  https://app.trackingtime.co/api/v4/
Multi-account:  https://app.trackingtime.co/api/v4/:account_id/:endpoint

Auth:     HTTP Basic (email:password)
Headers:  Authorization: Basic <base64(email:password)>
          Content-Type: application/json
          User-Agent: TrackingTimeMCP/1.0
```

## Response Format
```json
{
  "response": { "status": 200, "message": "ok" },
  "data": { }
}
```
- Status 200 = success, 500 = error (see `response.message`), 502 = user exception
- Always check `response.status` in the JSON body

## Critical Gotchas
- `accumulated_time` and `duration` = **seconds**
- `estimated_time` and `worked_hours` = **hours**
- Time entries are called **"events"** in the API
- `/tasks/add` is DEPRECATED — use `/tasks/share` instead
- Start timer returns 502 if already tracking and `stop_running_task` is not true
- Dates in query params: `YYYY-MM-DD`
- Datetimes for timers/entries: `yyyy-MM-dd HH:mm:ss`
- Default timezone: `GMT+11:00` (AEDT) or `GMT+10:00` (AEST)

## Key Endpoint Details

### Projects
```
GET    /projects                        # filter: ALL|ACTIVE|ARCHIVED|FOLLOWING (default ACTIVE)
GET    /projects/:id                    # include_tasks, include_billing params
POST   /projects/add                    # name (required), customer_name, service_name, template_id
PUT    /projects/update/:id
DELETE /projects/delete/:id             # delete_all=false to keep tasks/entries
PUT    /projects/close/:id              # archive
PUT    /projects/open/:id               # re-open
GET    /projects/search                 # keyword (3 char min), filter, type: PROJECT|TASK|ALL
GET    /projects/:id/users
POST   /projects/times                  # body: [{"id":1},{"id":2}] — returns accumulated times
```

### Tasks
```
GET    /tasks                           # filter: ALL|ACTIVE|ARCHIVED|TRACKING
GET    /tasks/:id
POST   /tasks/share                     # name (required), project_id, user_id, due_date, estimated_time, users: [{"id":1}]
PUT    /tasks/update/:id
DELETE /tasks/delete/:id                # delete_all=false to keep time entries
PUT    /tasks/close/:id
PUT    /tasks/open/:id
```

### Time Tracking (Timers)
```
POST   /tasks/track/:id                 # date (required), timezone, stop_running_task, task_name, project_name
POST   /tasks/stop/:id                  # date (required), timezone
POST   /tasks/sync/:id                  # heartbeat/keepalive
```
`task_name` + `project_name` params auto-create if not found.

### Time Entries (Events)
```
GET    /events                          # filter (required): USER|CUSTOMER|PROJECT|COMPANY|TASK
                                        # id (required except COMPANY), from, to (required, YYYY-MM-DD)
                                        # page, page_size (default 50), order: asc|desc
GET    /events/:event_id
POST   /events/add                      # duration (seconds, required), user_id (required), start, end, task_id, project_id, notes
PUT    /events/update/:id               # end (required), start, task_id, project_id, notes
DELETE /events/delete/:event_id
GET    /events/summary                  # from, to (required), users: [{"id":1}] — returns hours/user/day
GET    /events/export                   # separator (required), filter, id, from, to — returns CSV
PUT    /events/billed                   # body: [{"id":1},{"id":2}]
PUT    /events/not_billed               # body: [{"id":1},{"id":2}]
```

### Customers
```
GET    /customers                       # filter: ALL|ACTIVE|ARCHIVED (default ACTIVE)
GET    /customers/:id
POST   /customers/add                   # name (required, unique), notes, contact_name, contact_email
PUT    /customers/update/:id
DELETE /customers/delete/:id
PUT    /customers/close/:id             # archive
PUT    /customers/open/:id              # re-activate
```
