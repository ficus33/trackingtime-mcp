# TrackingTime MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that connects AI assistants like Claude to the [TrackingTime](https://trackingtime.co/) API v4. Manage projects, tasks, time tracking, staff assignments, and customers through natural language.

## Setup

### 1. Get your TrackingTime credentials

- **App Password:** TrackingTime → Manage → User Settings → Apps & Integrations → create a new App Password
- **Account ID:** Visible in your TrackingTime URL when logged in, or in account settings

### 2. Install and build

```bash
git clone https://github.com/ficus33/trackingtime-mcp.git
cd trackingtime-mcp
npm install
npm run build
```

### 3. Configure credentials

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
TT_APP_PASSWORD=your-app-password
TT_ACCOUNT_ID=your-account-id
```

### 4. Add to your AI assistant

**Claude Code:**

```bash
claude mcp add trackingtime -- node /path/to/trackingtime-mcp/dist/index.js
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "trackingtime": {
      "command": "node",
      "args": ["/path/to/trackingtime-mcp/dist/index.js"]
    }
  }
}
```

Restart your assistant after adding. The server reads credentials from the `.env` file automatically.

## Tools

### Projects

| Tool | Description |
|------|-------------|
| `tt_list_projects` | List projects (filter: ACTIVE/ARCHIVED/ALL/FOLLOWING) |
| `tt_search_projects` | Search projects and tasks by keyword |
| `tt_create_project` | Create a new project |
| `tt_update_project` | Edit project name, customer, or service |
| `tt_get_project` | Get single project with detail flags |
| `tt_archive_project` | Archive a project (reversible) |
| `tt_reopen_project` | Reopen an archived project |
| `tt_get_project_times` | Get accumulated time for multiple projects |
| `tt_get_project_users` | See which staff are on a project |

### Tasks

| Tool | Description |
|------|-------------|
| `tt_list_tasks` | List tasks (filter: ACTIVE/ARCHIVED/ALL/TRACKING) |
| `tt_create_task` | Create a task with assignees, due date, estimate |
| `tt_update_task` | Edit task or reassign staff |
| `tt_get_task` | Get single task details |
| `tt_close_task` | Mark a task as complete |
| `tt_reopen_task` | Reopen a completed task |
| `tt_delete_task` | Delete a task |
| `tt_search_tasks` | Search tasks by name within projects |

### Time Tracking

| Tool | Description |
|------|-------------|
| `tt_start_timer` | Start a timer on a task |
| `tt_stop_timer` | Stop a running timer |

### Time Entries

| Tool | Description |
|------|-------------|
| `tt_list_time_entries` | List entries by user/project/customer/task + date range |
| `tt_add_time_entry` | Add a manual time entry (duration in seconds) |
| `tt_get_time_entry` | Get a single time entry |
| `tt_update_time_entry` | Edit a time entry |
| `tt_delete_time_entry` | Delete a time entry |
| `tt_get_events_summary` | Summary of hours per user per day |
| `tt_export_time_entries` | Export as CSV |
| `tt_mark_billed` | Flag entries as billed |
| `tt_mark_not_billed` | Unflag billed entries |

### Users & Staff

| Tool | Description |
|------|-------------|
| `tt_list_users` | List all staff (find user IDs) |
| `tt_assign_user_projects` | Assign staff to projects |
| `tt_remove_user_projects` | Remove staff from projects |
| `tt_get_user_trackables` | All projects and tasks assigned to a user |

### Customers

| Tool | Description |
|------|-------------|
| `tt_list_customers` | List customers (filter: ACTIVE/ARCHIVED/ALL) |
| `tt_create_customer` | Create a new customer |
| `tt_update_customer` | Edit customer details |

### Additional tools (commented out)

The source includes ~20 more pre-built tools that are commented out to keep the active tool count manageable. To activate any of them, open `src/tools.ts`, remove the `/* */` around the tool, and run `npm run build`. These include:

- Project: delete, merge, list IDs, update preferences
- Tasks: sort, get times, bulk import
- Users: get details, update, archive/reactivate, get tasks, get tracking, get projects, invite
- Customers: get details, delete, archive/reactivate

## Testing

Use [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test tools interactively:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## API Notes

A few TrackingTime API quirks to be aware of:

- `duration` and `accumulated_time` are in **seconds**
- `estimated_time` and `worked_hours` are in **hours**
- Time entries are called "events" in the API
- Starting a timer when one is already running returns error 502 — use `stop_running_task=true` to auto-stop the current timer
- Dates use `YYYY-MM-DD`, datetimes use `yyyy-MM-dd HH:mm:ss`

## Auth

This server uses TrackingTime's **App Password** authentication. Your real password is never stored. The App Password is sent as HTTP Basic auth (`API_TOKEN:<app_password>`) over SSL.

If an App Password is compromised, revoke it in TrackingTime and create a new one — no need to change your account password.

## License

[MIT](LICENSE)
