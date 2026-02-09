import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, TrackingTimeError } from "./api-client.js";

function formatError(err: unknown): string {
  if (err instanceof TrackingTimeError) {
    return `TrackingTime API error (${err.status}): ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(err: unknown) {
  return { content: [{ type: "text" as const, text: formatError(err) }], isError: true as const };
}

export function registerTools(server: McpServer) {
  // 1. tt_list_projects
  server.registerTool(
    "tt_list_projects",
    {
      title: "List Projects",
      description:
        "List TrackingTime projects. Returns active projects by default. " +
        "Use filter to show ALL, ACTIVE, ARCHIVED, or FOLLOWING projects.",
      inputSchema: {
        filter: z
          .enum(["ALL", "ACTIVE", "ARCHIVED", "FOLLOWING"])
          .optional()
          .describe("Project filter (default: ACTIVE)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ filter }) => {
      try {
        const params: Record<string, string> = {};
        if (filter) params.filter = filter;
        return toolResult(await apiRequest("GET", "/projects", params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 2. tt_search_projects
  server.registerTool(
    "tt_search_projects",
    {
      title: "Search Projects",
      description:
        "Search TrackingTime projects and tasks by keyword (min 3 characters). " +
        "Set type to PROJECT, TASK, or ALL to narrow results.",
      inputSchema: {
        keyword: z.string().min(3).describe("Search keyword (min 3 chars)"),
        filter: z
          .enum(["ALL", "ACTIVE", "ARCHIVED", "FOLLOWING"])
          .optional()
          .describe("Project filter"),
        type: z
          .enum(["PROJECT", "TASK", "ALL"])
          .optional()
          .describe("Search type (default: ALL)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ keyword, filter, type }) => {
      try {
        const params: Record<string, string> = { keyword };
        if (filter) params.filter = filter;
        if (type) params.type = type;
        return toolResult(await apiRequest("GET", "/projects/search", params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 3. tt_create_project
  server.registerTool(
    "tt_create_project",
    {
      title: "Create Project",
      description: "Create a new TrackingTime project.",
      inputSchema: {
        name: z.string().describe("Project name (required)"),
        customer_name: z.string().optional().describe("Customer name to associate"),
        service_name: z.string().optional().describe("Service/category name"),
        template_id: z.number().optional().describe("Template project ID to copy structure from"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ name, customer_name, service_name, template_id }) => {
      try {
        const body: Record<string, unknown> = { name };
        if (customer_name) body.customer_name = customer_name;
        if (service_name) body.service_name = service_name;
        if (template_id) body.template_id = template_id;
        return toolResult(await apiRequest("POST", "/projects/add", undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 4. tt_archive_project
  server.registerTool(
    "tt_archive_project",
    {
      title: "Archive Project",
      description: "Archive (close) a TrackingTime project. The project can be reopened later.",
      inputSchema: {
        id: z.number().describe("Project ID to archive"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("PUT", `/projects/close/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 5. tt_list_tasks
  server.registerTool(
    "tt_list_tasks",
    {
      title: "List Tasks",
      description:
        "List TrackingTime tasks. Filter by status or project. " +
        "Use filter=TRACKING to see currently running timers.",
      inputSchema: {
        filter: z
          .enum(["ALL", "ACTIVE", "ARCHIVED", "TRACKING"])
          .optional()
          .describe("Task filter (default: ACTIVE)"),
        project_id: z.number().optional().describe("Filter by project ID"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ filter, project_id }) => {
      try {
        const params: Record<string, string> = {};
        if (filter) params.filter = filter;
        if (project_id !== undefined) params.project_id = String(project_id);
        return toolResult(await apiRequest("GET", "/tasks", params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 6. tt_create_task
  server.registerTool(
    "tt_create_task",
    {
      title: "Create Task",
      description:
        "Create a new task in TrackingTime. estimated_time is in hours.",
      inputSchema: {
        name: z.string().describe("Task name (required)"),
        project_id: z.number().optional().describe("Project ID to add task to"),
        user_id: z.number().optional().describe("Assign to user ID"),
        due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
        estimated_time: z.number().optional().describe("Estimated time in hours"),
        users: z
          .array(z.object({ id: z.number() }))
          .optional()
          .describe('Users to share with, e.g. [{"id":1},{"id":2}]'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ name, project_id, user_id, due_date, estimated_time, users }) => {
      try {
        const body: Record<string, unknown> = { name };
        if (project_id !== undefined) body.project_id = project_id;
        if (user_id !== undefined) body.user_id = user_id;
        if (due_date) body.due_date = due_date;
        if (estimated_time !== undefined) body.estimated_time = estimated_time;
        if (users) body.users = users;
        return toolResult(await apiRequest("POST", "/tasks/share", undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 7. tt_update_task
  server.registerTool(
    "tt_update_task",
    {
      title: "Update Task",
      description:
        "Update an existing TrackingTime task. Use the users param to reassign " +
        "the task to different staff (use tt_list_users to find user IDs).",
      inputSchema: {
        id: z.number().describe("Task ID to update"),
        name: z.string().optional().describe("New task name"),
        project_id: z.number().optional().describe("Move to project ID"),
        due_date: z.string().optional().describe("New due date (YYYY-MM-DD)"),
        estimated_time: z.number().optional().describe("Estimated time in hours"),
        users: z
          .array(z.object({ id: z.number() }))
          .optional()
          .describe('Reassign to users, e.g. [{"id":1},{"id":2}]'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, name, project_id, due_date, estimated_time, users }) => {
      try {
        const body: Record<string, unknown> = {};
        if (name) body.name = name;
        if (project_id !== undefined) body.project_id = project_id;
        if (due_date) body.due_date = due_date;
        if (estimated_time !== undefined) body.estimated_time = estimated_time;
        if (users) body.users = users;
        return toolResult(await apiRequest("PUT", `/tasks/update/${id}`, undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 8. tt_close_task
  server.registerTool(
    "tt_close_task",
    {
      title: "Close Task",
      description: "Close (complete) a TrackingTime task.",
      inputSchema: {
        id: z.number().describe("Task ID to close"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("PUT", `/tasks/close/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 9. tt_start_timer
  server.registerTool(
    "tt_start_timer",
    {
      title: "Start Timer",
      description:
        "Start tracking time on a task. Set stop_running_task=true to stop any " +
        "currently running timer first (otherwise returns error 502 if a timer is already running).",
      inputSchema: {
        id: z.number().describe("Task ID to start tracking"),
        date: z.string().describe("Start datetime (yyyy-MM-dd HH:mm:ss)"),
        timezone: z
          .string()
          .optional()
          .describe("Timezone offset, e.g. GMT+11:00 (default: GMT+11:00)"),
        stop_running_task: z
          .boolean()
          .optional()
          .describe("Stop any currently running timer first (recommended)"),
        task_name: z.string().optional().describe("Task name — auto-creates if ID not found"),
        project_name: z.string().optional().describe("Project name — auto-creates if not found"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ id, date, timezone, stop_running_task, task_name, project_name }) => {
      try {
        const body: Record<string, unknown> = { date };
        if (timezone) body.timezone = timezone;
        if (stop_running_task !== undefined) body.stop_running_task = stop_running_task;
        if (task_name) body.task_name = task_name;
        if (project_name) body.project_name = project_name;
        return toolResult(await apiRequest("POST", `/tasks/track/${id}`, undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 10. tt_stop_timer
  server.registerTool(
    "tt_stop_timer",
    {
      title: "Stop Timer",
      description: "Stop tracking time on a task.",
      inputSchema: {
        id: z.number().describe("Task ID to stop tracking"),
        date: z.string().describe("Stop datetime (yyyy-MM-dd HH:mm:ss)"),
        timezone: z.string().optional().describe("Timezone offset, e.g. GMT+11:00"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, date, timezone }) => {
      try {
        const body: Record<string, unknown> = { date };
        if (timezone) body.timezone = timezone;
        return toolResult(await apiRequest("POST", `/tasks/stop/${id}`, undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 11. tt_list_time_entries
  server.registerTool(
    "tt_list_time_entries",
    {
      title: "List Time Entries",
      description:
        "List time entries (events) from TrackingTime. Requires filter, from, and to dates. " +
        "The id param is required unless filter=COMPANY. " +
        "Note: duration and accumulated_time values are in seconds.",
      inputSchema: {
        filter: z
          .enum(["USER", "CUSTOMER", "PROJECT", "COMPANY", "TASK"])
          .describe("Filter type (required)"),
        id: z
          .number()
          .optional()
          .describe("ID for the filter entity (required unless filter=COMPANY)"),
        from: z.string().describe("Start date (YYYY-MM-DD)"),
        to: z.string().describe("End date (YYYY-MM-DD)"),
        page: z.number().optional().describe("Page number"),
        page_size: z.number().optional().describe("Results per page (default 50)"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ filter, id, from, to, page, page_size, order }) => {
      try {
        const params: Record<string, string> = { filter, from, to };
        if (id !== undefined) params.id = String(id);
        if (page !== undefined) params.page = String(page);
        if (page_size !== undefined) params.page_size = String(page_size);
        if (order) params.order = order;
        return toolResult(await apiRequest("GET", "/events", params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 12. tt_add_time_entry
  server.registerTool(
    "tt_add_time_entry",
    {
      title: "Add Time Entry",
      description:
        "Add a manual time entry (event) to TrackingTime. " +
        "Duration is in seconds (e.g. 3600 = 1 hour).",
      inputSchema: {
        duration: z.number().describe("Duration in seconds (required)"),
        user_id: z.number().describe("User ID (required)"),
        task_id: z.number().optional().describe("Task ID"),
        project_id: z.number().optional().describe("Project ID"),
        start: z.string().optional().describe("Start datetime (yyyy-MM-dd HH:mm:ss)"),
        end: z.string().optional().describe("End datetime (yyyy-MM-dd HH:mm:ss)"),
        notes: z.string().optional().describe("Notes for the time entry"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ duration, user_id, task_id, project_id, start, end, notes }) => {
      try {
        const body: Record<string, unknown> = { duration, user_id };
        if (task_id !== undefined) body.task_id = task_id;
        if (project_id !== undefined) body.project_id = project_id;
        if (start) body.start = start;
        if (end) body.end = end;
        if (notes) body.notes = notes;
        return toolResult(await apiRequest("POST", "/events/add", undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 13. tt_get_events_summary
  server.registerTool(
    "tt_get_events_summary",
    {
      title: "Get Events Summary",
      description:
        "Get a summary of tracked hours per user per day. " +
        "Returns worked_hours (in hours, not seconds).",
      inputSchema: {
        from: z.string().describe("Start date (YYYY-MM-DD)"),
        to: z.string().describe("End date (YYYY-MM-DD)"),
        users: z
          .array(z.object({ id: z.number() }))
          .optional()
          .describe('Filter by users, e.g. [{"id":1}]'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ from, to, users }) => {
      try {
        const params: Record<string, string> = { from, to };
        if (users) params.users = JSON.stringify(users);
        return toolResult(await apiRequest("GET", "/events/summary", params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 14. tt_list_customers
  server.registerTool(
    "tt_list_customers",
    {
      title: "List Customers",
      description: "List TrackingTime customers. Returns active customers by default.",
      inputSchema: {
        filter: z
          .enum(["ALL", "ACTIVE", "ARCHIVED"])
          .optional()
          .describe("Customer filter (default: ACTIVE)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ filter }) => {
      try {
        const params: Record<string, string> = {};
        if (filter) params.filter = filter;
        return toolResult(await apiRequest("GET", "/customers", params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 15. tt_list_users
  server.registerTool(
    "tt_list_users",
    {
      title: "List Users",
      description:
        "List all users (staff) in your TrackingTime account. " +
        "Use this to find user IDs for task assignment, project assignment, or time entries. " +
        "Requires admin or project manager role.",
      inputSchema: {
        filter: z
          .enum(["ALL", "ACTIVE", "ARCHIVED", "INVITED"])
          .optional()
          .describe("User filter (default: ACTIVE)"),
        include_teams: z
          .boolean()
          .optional()
          .describe("Include team membership info"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ filter, include_teams }) => {
      try {
        const params: Record<string, string> = {};
        if (filter) params.filter = filter;
        if (include_teams) params.include_teams = "true";
        return toolResult(await apiRequest("GET", "/users", params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 16. tt_update_project
  server.registerTool(
    "tt_update_project",
    {
      title: "Update Project",
      description: "Update an existing TrackingTime project (name, customer, service).",
      inputSchema: {
        id: z.number().describe("Project ID to update"),
        name: z.string().optional().describe("New project name"),
        customer_name: z.string().optional().describe("New customer name"),
        service_name: z.string().optional().describe("New service/category name"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, name, customer_name, service_name }) => {
      try {
        const body: Record<string, unknown> = {};
        if (name) body.name = name;
        if (customer_name) body.customer_name = customer_name;
        if (service_name) body.service_name = service_name;
        return toolResult(await apiRequest("POST", `/projects/update/${id}`, undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 17. tt_get_project_users
  server.registerTool(
    "tt_get_project_users",
    {
      title: "Get Project Users",
      description:
        "List all users assigned to a specific project. " +
        "Returns users who have at least one task in the project.",
      inputSchema: {
        id: z.number().describe("Project ID"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("GET", `/projects/${id}/users`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 18. tt_assign_user_projects
  server.registerTool(
    "tt_assign_user_projects",
    {
      title: "Assign User to Projects",
      description:
        "Assign a user to one or more projects. " +
        "Use tt_list_users to find user IDs and tt_list_projects for project IDs. " +
        "Requires admin or project manager role.",
      inputSchema: {
        user_id: z.number().describe("User ID to assign"),
        project_ids: z
          .array(z.number())
          .describe("Array of project IDs to assign the user to, e.g. [1, 2, 3]"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ user_id, project_ids }) => {
      try {
        const data = project_ids.map((id) => ({ id }));
        return toolResult(
          await apiRequest("POST", `/users/${user_id}/assign_projects`, undefined, { data }),
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 19. tt_remove_user_projects
  server.registerTool(
    "tt_remove_user_projects",
    {
      title: "Remove User from Projects",
      description:
        "Remove a user from one or more projects. " +
        "Requires admin or project manager role.",
      inputSchema: {
        user_id: z.number().describe("User ID to remove"),
        project_ids: z
          .array(z.number())
          .describe("Array of project IDs to remove the user from, e.g. [1, 2, 3]"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ user_id, project_ids }) => {
      try {
        const data = project_ids.map((id) => ({ id }));
        return toolResult(
          await apiRequest("POST", `/users/${user_id}/remove_projects`, undefined, { data }),
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 20. tt_create_customer
  server.registerTool(
    "tt_create_customer",
    {
      title: "Create Customer",
      description:
        "Create a new customer/client in TrackingTime. " +
        "Customer names must be unique. " +
        "Requires admin or project manager role.",
      inputSchema: {
        name: z.string().describe("Customer name (required, must be unique)"),
        notes: z.string().optional().describe("Notes about the customer"),
        contact_name: z.string().optional().describe("Primary contact name"),
        contact_email: z.string().optional().describe("Primary contact email"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ name, notes, contact_name, contact_email }) => {
      try {
        const body: Record<string, unknown> = { name };
        if (notes) body.notes = notes;
        if (contact_name) body.contact_name = contact_name;
        if (contact_email) body.contact_email = contact_email;
        return toolResult(await apiRequest("POST", "/customers/add", undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 21. tt_update_customer
  server.registerTool(
    "tt_update_customer",
    {
      title: "Update Customer",
      description:
        "Update an existing customer/client. Only include fields you want to change. " +
        "Requires admin or project manager role.",
      inputSchema: {
        id: z.number().describe("Customer ID to update"),
        name: z.string().optional().describe("New customer name (must be unique)"),
        notes: z.string().optional().describe("Updated notes"),
        contact_name: z.string().optional().describe("Updated contact name"),
        contact_email: z.string().optional().describe("Updated contact email"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, name, notes, contact_name, contact_email }) => {
      try {
        const body: Record<string, unknown> = {};
        if (name) body.name = name;
        if (notes) body.notes = notes;
        if (contact_name) body.contact_name = contact_name;
        if (contact_email) body.contact_email = contact_email;
        return toolResult(await apiRequest("PUT", `/customers/update/${id}`, undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // ── Projects: additional active tools ──────────────────────────────

  // 22. tt_get_project
  server.registerTool(
    "tt_get_project",
    {
      title: "Get Project",
      description:
        "Get a single TrackingTime project with optional detail flags.",
      inputSchema: {
        id: z.number().describe("Project ID"),
        include_tasks: z.boolean().optional().describe("Include project tasks"),
        include_task_lists: z.boolean().optional().describe("Include task lists"),
        include_billing: z.boolean().optional().describe("Include billing data"),
        include_subtasks: z.boolean().optional().describe("Include subtasks"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, include_tasks, include_task_lists, include_billing, include_subtasks }) => {
      try {
        const params: Record<string, string> = {};
        if (include_tasks) params.include_tasks = "true";
        if (include_task_lists) params.include_task_lists = "true";
        if (include_billing) params.include_billing = "true";
        if (include_subtasks) params.include_subtasks = "true";
        return toolResult(await apiRequest("GET", `/projects/${id}`, params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 23. tt_reopen_project
  server.registerTool(
    "tt_reopen_project",
    {
      title: "Reopen Project",
      description: "Reopen a previously archived TrackingTime project.",
      inputSchema: {
        id: z.number().describe("Project ID to reopen"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("POST", `/projects/open/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 24. tt_get_project_times
  server.registerTool(
    "tt_get_project_times",
    {
      title: "Get Project Times",
      description:
        "Get accumulated tracked times for one or more projects. " +
        "Returns time data including estimates and totals.",
      inputSchema: {
        project_ids: z
          .array(z.number())
          .describe("Array of project IDs, e.g. [1, 2, 3]"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ project_ids }) => {
      try {
        const data = project_ids.map((id) => ({ id }));
        return toolResult(await apiRequest("POST", "/projects/times", undefined, data));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // ── Tasks: additional active tools ─────────────────────────────────

  // 25. tt_get_task
  server.registerTool(
    "tt_get_task",
    {
      title: "Get Task",
      description: "Get a single TrackingTime task by ID with optional billing data.",
      inputSchema: {
        id: z.number().describe("Task ID"),
        include_billing: z.boolean().optional().describe("Include billing data"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, include_billing }) => {
      try {
        const params: Record<string, string> = {};
        if (include_billing) params.include_billing = "true";
        return toolResult(await apiRequest("GET", `/tasks/${id}`, params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 26. tt_delete_task
  server.registerTool(
    "tt_delete_task",
    {
      title: "Delete Task",
      description:
        "Delete a TrackingTime task. Set delete_all=false to keep associated time entries.",
      inputSchema: {
        id: z.number().describe("Task ID to delete"),
        delete_all: z
          .boolean()
          .optional()
          .describe("Also delete time entries (default: true). Set false to keep them."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ id, delete_all }) => {
      try {
        const params: Record<string, string> = {};
        if (delete_all !== undefined) params.delete_all = String(delete_all);
        return toolResult(await apiRequest("DELETE", `/tasks/delete/${id}`, params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 27. tt_reopen_task
  server.registerTool(
    "tt_reopen_task",
    {
      title: "Reopen Task",
      description: "Reopen a previously closed/completed TrackingTime task.",
      inputSchema: {
        id: z.number().describe("Task ID to reopen"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("PUT", `/tasks/open/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 28. tt_search_tasks
  server.registerTool(
    "tt_search_tasks",
    {
      title: "Search Tasks",
      description:
        "Search active tasks by name within specific projects. " +
        "Pass an array of {project_name, task_name} pairs to search.",
      inputSchema: {
        data: z
          .array(
            z.object({
              project_name: z.string().describe("Project name to search within"),
              task_name: z.string().describe("Task name to search for"),
            }),
          )
          .describe("Array of project/task name pairs to search"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ data }) => {
      try {
        return toolResult(await apiRequest("POST", "/tasks/search", undefined, { data }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // ── Time entries: additional active tools ───────────────────────────

  // 29. tt_get_time_entry
  server.registerTool(
    "tt_get_time_entry",
    {
      title: "Get Time Entry",
      description: "Get a single time entry (event) by ID.",
      inputSchema: {
        id: z.number().describe("Time entry (event) ID"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("GET", `/events/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 30. tt_update_time_entry
  server.registerTool(
    "tt_update_time_entry",
    {
      title: "Update Time Entry",
      description:
        "Update an existing time entry (event). " +
        "The end datetime is required. Only include other fields you want to change.",
      inputSchema: {
        id: z.number().describe("Time entry ID to update"),
        end: z.string().describe("End datetime (yyyy-MM-dd HH:mm:ss) — required"),
        start: z.string().optional().describe("Start datetime (yyyy-MM-dd HH:mm:ss)"),
        task_id: z.number().optional().describe("Move to different task"),
        project_id: z.number().optional().describe("Move to different project"),
        notes: z.string().optional().describe("Updated notes"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, end, start, task_id, project_id, notes }) => {
      try {
        const body: Record<string, unknown> = { end };
        if (start) body.start = start;
        if (task_id !== undefined) body.task_id = task_id;
        if (project_id !== undefined) body.project_id = project_id;
        if (notes) body.notes = notes;
        return toolResult(await apiRequest("PUT", `/events/update/${id}`, undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 31. tt_delete_time_entry
  server.registerTool(
    "tt_delete_time_entry",
    {
      title: "Delete Time Entry",
      description: "Delete a time entry (event). This cannot be undone.",
      inputSchema: {
        id: z.number().describe("Time entry (event) ID to delete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("DELETE", `/events/delete/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 32. tt_export_time_entries
  server.registerTool(
    "tt_export_time_entries",
    {
      title: "Export Time Entries",
      description:
        "Export time entries as CSV. " +
        "Returns CSV text with the specified separator.",
      inputSchema: {
        separator: z
          .enum([",", ";", "\\t"])
          .describe("CSV separator character (required)"),
        filter: z
          .enum(["USER", "CUSTOMER", "PROJECT", "COMPANY", "TASK"])
          .optional()
          .describe("Filter type"),
        id: z.number().optional().describe("ID for the filter entity"),
        from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        to: z.string().optional().describe("End date (YYYY-MM-DD)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ separator, filter, id, from, to }) => {
      try {
        const params: Record<string, string> = { separator };
        if (filter) params.filter = filter;
        if (id !== undefined) params.id = String(id);
        if (from) params.from = from;
        if (to) params.to = to;
        return toolResult(await apiRequest("GET", "/events/export", params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 33. tt_mark_billed
  server.registerTool(
    "tt_mark_billed",
    {
      title: "Mark Time Entries as Billed",
      description: "Mark one or more time entries as billed (for invoicing).",
      inputSchema: {
        entry_ids: z
          .array(z.number())
          .describe("Array of time entry IDs to mark as billed, e.g. [1, 2, 3]"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ entry_ids }) => {
      try {
        const data = entry_ids.map((id) => ({ id }));
        return toolResult(await apiRequest("PUT", "/events/billed", undefined, data));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // 34. tt_mark_not_billed
  server.registerTool(
    "tt_mark_not_billed",
    {
      title: "Mark Time Entries as Not Billed",
      description: "Mark one or more time entries as not billed (undo billing flag).",
      inputSchema: {
        entry_ids: z
          .array(z.number())
          .describe("Array of time entry IDs to mark as not billed, e.g. [1, 2, 3]"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ entry_ids }) => {
      try {
        const data = entry_ids.map((id) => ({ id }));
        return toolResult(await apiRequest("PUT", "/events/not_billed", undefined, data));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // ── Commented-out tools (uncomment as needed) ──────────────────────
  // Each block below is a complete tool registration ready to activate.

  /*
  // tt_list_project_ids — lightweight list of project IDs only
  server.registerTool(
    "tt_list_project_ids",
    {
      title: "List Project IDs",
      description: "List only project IDs (lightweight). Useful for batch operations.",
      inputSchema: {
        filter: z
          .enum(["ALL", "ACTIVE", "ARCHIVED", "FOLLOWING"])
          .optional()
          .describe("Project filter (default: ACTIVE)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ filter }) => {
      try {
        const params: Record<string, string> = {};
        if (filter) params.filter = filter;
        return toolResult(await apiRequest("GET", "/projects/ids", params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_delete_project — permanently delete a project
  server.registerTool(
    "tt_delete_project",
    {
      title: "Delete Project",
      description:
        "Permanently delete a TrackingTime project. " +
        "Set delete_all=false to keep tasks and time entries.",
      inputSchema: {
        id: z.number().describe("Project ID to delete"),
        delete_all: z
          .boolean()
          .optional()
          .describe("Also delete tasks/entries (default: true). Set false to keep them."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ id, delete_all }) => {
      try {
        const params: Record<string, string> = {};
        if (delete_all !== undefined) params.delete_all = String(delete_all);
        return toolResult(await apiRequest("DELETE", `/projects/delete/${id}`, params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_merge_projects — merge one project into another
  server.registerTool(
    "tt_merge_projects",
    {
      title: "Merge Projects",
      description:
        "Merge a source project into a target project. " +
        "All tasks and entries move to the target.",
      inputSchema: {
        source_id: z.number().describe("Source project ID (will be merged away)"),
        target_id: z.number().describe("Target project ID (will receive everything)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ source_id, target_id }) => {
      try {
        return toolResult(
          await apiRequest("POST", `/projects/merge/${source_id}`, undefined, { into: target_id }),
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_update_project_preferences — set favorite, default view, etc.
  server.registerTool(
    "tt_update_project_preferences",
    {
      title: "Update Project Preferences",
      description: "Update your personal preferences for a project (view, favorite, show closed).",
      inputSchema: {
        id: z.number().describe("Project ID"),
        default_view: z.string().optional().describe("Default view for this project"),
        is_favorite: z.boolean().optional().describe("Mark as favorite"),
        show_closed_tasks: z.boolean().optional().describe("Show closed tasks"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, default_view, is_favorite, show_closed_tasks }) => {
      try {
        const body: Record<string, unknown> = {};
        if (default_view) body.default_view = default_view;
        if (is_favorite !== undefined) body.is_favorite = is_favorite;
        if (show_closed_tasks !== undefined) body.show_closed_tasks = show_closed_tasks;
        return toolResult(
          await apiRequest("POST", `/projects/update_preferences/${id}`, undefined, body),
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_sort_tasks — reorder tasks
  server.registerTool(
    "tt_sort_tasks",
    {
      title: "Sort Tasks",
      description: "Reorder tasks by providing task IDs with sort indices.",
      inputSchema: {
        data: z
          .array(z.object({ id: z.number(), sort_index: z.number() }))
          .describe('Array of {id, sort_index} pairs, e.g. [{"id":1,"sort_index":0}]'),
        by_day: z.boolean().optional().describe("Sort by day_index instead (default: false)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ data, by_day }) => {
      try {
        const body: Record<string, unknown> = { data };
        if (by_day !== undefined) body.by_day = by_day;
        return toolResult(await apiRequest("POST", "/tasks/sort", undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_get_task_times — accumulated times for multiple tasks
  server.registerTool(
    "tt_get_task_times",
    {
      title: "Get Task Times",
      description: "Get accumulated tracked times for one or more tasks.",
      inputSchema: {
        task_ids: z
          .array(z.number())
          .describe("Array of task IDs, e.g. [1, 2, 3]"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ task_ids }) => {
      try {
        const data = task_ids.map((id) => ({ id }));
        return toolResult(await apiRequest("POST", "/tasks/times", undefined, data));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_import_tasks — bulk import tasks
  server.registerTool(
    "tt_import_tasks",
    {
      title: "Import Tasks",
      description:
        "Bulk import tasks with project/customer/service info. " +
        "Set preview_mode=true to validate without importing.",
      inputSchema: {
        data: z
          .array(
            z.object({
              task_name: z.string().describe("Task name"),
              project_name: z.string().optional().describe("Project name (auto-created)"),
              customer_name: z.string().optional().describe("Customer name"),
              service_name: z.string().optional().describe("Service name"),
            }),
          )
          .describe("Array of tasks to import"),
        preview_mode: z.boolean().optional().describe("Validate only, don't import (default: false)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ data, preview_mode }) => {
      try {
        const body: Record<string, unknown> = { data };
        if (preview_mode !== undefined) body.preview_mode = preview_mode;
        return toolResult(await apiRequest("POST", "/account/import/tasks", undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_get_user — get single user details
  server.registerTool(
    "tt_get_user",
    {
      title: "Get User",
      description: "Get details for a single user by ID.",
      inputSchema: {
        id: z.number().describe("User ID"),
        include_billing: z.boolean().optional().describe("Include billing data"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, include_billing }) => {
      try {
        const params: Record<string, string> = {};
        if (include_billing) params.include_billing = "true";
        return toolResult(await apiRequest("GET", `/users/${id}`, params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_update_user — update user profile
  server.registerTool(
    "tt_update_user",
    {
      title: "Update User",
      description: "Update a user's profile. Admins can update others; users can self-edit.",
      inputSchema: {
        id: z.number().describe("User ID to update"),
        name: z.string().optional().describe("First name"),
        surname: z.string().optional().describe("Last name"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, name, surname }) => {
      try {
        const body: Record<string, unknown> = {};
        if (name) body.name = name;
        if (surname) body.surname = surname;
        return toolResult(await apiRequest("POST", `/users/update/${id}`, undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_archive_user — deactivate a user
  server.registerTool(
    "tt_archive_user",
    {
      title: "Archive User",
      description: "Archive (deactivate) a user. Admin only.",
      inputSchema: {
        id: z.number().describe("User ID to archive"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("POST", `/users/close/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_reactivate_user — reactivate an archived user
  server.registerTool(
    "tt_reactivate_user",
    {
      title: "Reactivate User",
      description: "Reactivate a previously archived user. Admin only.",
      inputSchema: {
        id: z.number().describe("User ID to reactivate"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("POST", `/users/open/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_get_user_tasks — list a user's tasks grouped by project
  server.registerTool(
    "tt_get_user_tasks",
    {
      title: "Get User Tasks",
      description: "List all tasks for a user, grouped by project.",
      inputSchema: {
        user_id: z.number().describe("User ID"),
        filter: z
          .enum(["ALL", "ACTIVE", "ARCHIVED", "TRACKING"])
          .optional()
          .describe("Task filter (default: ACTIVE)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ user_id, filter }) => {
      try {
        const params: Record<string, string> = {};
        if (filter) params.filter = filter;
        return toolResult(await apiRequest("GET", `/users/${user_id}/tasks`, params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_get_user_tracking — see what a user is currently tracking
  server.registerTool(
    "tt_get_user_tracking",
    {
      title: "Get User Tracking",
      description: "Get all tasks a user is currently tracking (running timers).",
      inputSchema: {
        user_id: z.number().describe("User ID"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ user_id }) => {
      try {
        return toolResult(await apiRequest("GET", `/users/${user_id}/tasks/tracking`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  // 35. tt_get_user_trackables
  server.registerTool(
    "tt_get_user_trackables",
    {
      title: "Get User Trackables",
      description:
        "List all projects and tasks assigned to a user. " +
        "Optionally filter to favorites only or a specific project.",
      inputSchema: {
        user_id: z.number().describe("User ID"),
        only_favorites: z.boolean().optional().describe("Only show favorites"),
        include_tasks: z.boolean().optional().describe("Include tasks"),
        project_id: z.number().optional().describe("Filter to a specific project"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ user_id, only_favorites, include_tasks, project_id }) => {
      try {
        const params: Record<string, string> = {};
        if (only_favorites) params.only_favorites = "true";
        if (include_tasks) params.include_tasks = "true";
        if (project_id !== undefined) params.project_id = String(project_id);
        return toolResult(await apiRequest("GET", `/users/${user_id}/trackables`, params));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  /*
  // tt_get_user_projects — list projects assigned to a user
  server.registerTool(
    "tt_get_user_projects",
    {
      title: "Get User Projects",
      description: "List all projects a user has been assigned to.",
      inputSchema: {
        user_id: z.number().describe("User ID"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ user_id }) => {
      try {
        return toolResult(await apiRequest("GET", `/users/${user_id}/projects`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_invite_users — invite people to your TrackingTime account
  server.registerTool(
    "tt_invite_users",
    {
      title: "Invite Users",
      description:
        "Invite people to join your TrackingTime team by email. " +
        "Max 20 emails per request. Requires admin or project manager role.",
      inputSchema: {
        emails: z.array(z.string()).describe("Array of email addresses to invite"),
        project_id: z.number().optional().describe("Auto-assign to this project"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ emails, project_id }) => {
      try {
        const body: Record<string, unknown> = { emails };
        if (project_id !== undefined) body.project_id = project_id;
        return toolResult(await apiRequest("POST", "/users/invite", undefined, body));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_get_customer — get single customer details
  server.registerTool(
    "tt_get_customer",
    {
      title: "Get Customer",
      description: "Get a single customer/client by ID.",
      inputSchema: {
        id: z.number().describe("Customer ID"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("GET", `/customers/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_delete_customer — permanently delete a customer
  server.registerTool(
    "tt_delete_customer",
    {
      title: "Delete Customer",
      description:
        "Permanently delete a customer. All project references to this customer will be set to null.",
      inputSchema: {
        id: z.number().describe("Customer ID to delete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("DELETE", `/customers/delete/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_archive_customer — archive a customer
  server.registerTool(
    "tt_archive_customer",
    {
      title: "Archive Customer",
      description: "Archive a customer. Can be reactivated later.",
      inputSchema: {
        id: z.number().describe("Customer ID to archive"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("POST", `/customers/close/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */

  /*
  // tt_reactivate_customer — reactivate an archived customer
  server.registerTool(
    "tt_reactivate_customer",
    {
      title: "Reactivate Customer",
      description: "Reactivate a previously archived customer.",
      inputSchema: {
        id: z.number().describe("Customer ID to reactivate"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        return toolResult(await apiRequest("POST", `/customers/open/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
  */
}
