import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load .env from the project root (not cwd), so it works when Claude Code
// launches the server from any directory.
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "..", ".env") });

const TT_APP_PASSWORD = process.env.TT_APP_PASSWORD;
const TT_ACCOUNT_ID = process.env.TT_ACCOUNT_ID;

if (!TT_APP_PASSWORD || !TT_ACCOUNT_ID) {
  throw new Error(
    "Missing required env vars: TT_APP_PASSWORD, TT_ACCOUNT_ID. " +
      "Create an App Password in TrackingTime: Manage → User Settings → Apps & Integrations",
  );
}

const BASE_URL = `https://app.trackingtime.co/api/v4/${TT_ACCOUNT_ID}`;
const AUTH_HEADER =
  "Basic " + Buffer.from(`API_TOKEN:${TT_APP_PASSWORD}`).toString("base64");
const REQUEST_TIMEOUT_MS = 30_000;

interface TTResponse {
  response: { status: number; message: string };
  data: unknown;
}

export class TrackingTimeError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "TrackingTimeError";
  }
}

const ERROR_HINTS: Record<number, string> = {
  401: "Check that your App Password is correct and hasn't been revoked.",
  403: "Your account may not have permission for this action.",
  502: "This usually means a timer is already running. " +
    "Use stop_running_task=true on tt_start_timer, or call tt_stop_timer first.",
};

export async function apiRequest(
  method: string,
  endpoint: string,
  params?: Record<string, string>,
  body?: unknown,
): Promise<unknown> {
  let url = `${BASE_URL}/${endpoint.replace(/^\//, "")}`;

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const options: RequestInit = {
    method,
    signal: controller.signal,
    headers: {
      Authorization: AUTH_HEADER,
      "Content-Type": "application/json",
      "User-Agent": "TrackingTimeMCP/1.0",
    },
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TrackingTimeError(0, "Request timed out after 30s. TrackingTime may be unavailable.");
    }
    throw new TrackingTimeError(0, `Network error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeout);
  }

  // Handle non-JSON responses (HTML error pages, 502 gateway errors, etc.)
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new TrackingTimeError(
      res.status,
      `TrackingTime returned HTTP ${res.status} with non-JSON response. The service may be temporarily unavailable.`,
    );
  }

  const json = (await res.json()) as TTResponse;

  if (json.response.status !== 200) {
    const apiMessage = json.response.message || `API error (status ${json.response.status})`;
    const hint = ERROR_HINTS[json.response.status];
    const message = hint ? `${apiMessage}. ${hint}` : apiMessage;
    throw new TrackingTimeError(json.response.status, message);
  }

  return json.data;
}

/**
 * Like apiRequest, but returns raw response text instead of parsed JSON.
 * Used for endpoints that return non-JSON data (e.g. CSV export).
 */
export async function rawApiRequest(
  method: string,
  endpoint: string,
  params?: Record<string, string>,
): Promise<string> {
  let url = `${BASE_URL}/${endpoint.replace(/^\//, "")}`;

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const options: RequestInit = {
    method,
    signal: controller.signal,
    headers: {
      Authorization: AUTH_HEADER,
      "Content-Type": "application/json",
      "User-Agent": "TrackingTimeMCP/1.0",
    },
  };

  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TrackingTimeError(0, "Request timed out after 30s. TrackingTime may be unavailable.");
    }
    throw new TrackingTimeError(0, `Network error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new TrackingTimeError(res.status, `TrackingTime returned HTTP ${res.status}`);
  }

  return await res.text();
}
