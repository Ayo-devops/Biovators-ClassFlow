import "server-only";

import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      )
    : null;

function bearerToken(request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

function secretMatches(provided, expected) {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function adminEmailAllowlist() {
  return new Set(
    (process.env.CLASSFLOW_ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function authenticatedUser(request) {
  if (!supabase) {
    return {
      error: Response.json(
        { error: "Workspace authentication is not configured." },
        { status: 503 },
      ),
    };
  }

  const token = bearerToken(request);
  if (!token) {
    return {
      error: Response.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return {
      error: Response.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const email = data.user.email?.toLowerCase();
  const role =
    email && adminEmailAllowlist().has(email)
      ? "admin"
      : data.user.app_metadata?.role;

  return { user: data.user, role };
}

export async function authorizeWorkspaceMember(request) {
  const authentication = await authenticatedUser(request);
  if (authentication.error) return authentication;

  if (!["admin", "rep"].includes(authentication.role)) {
    return {
      error: Response.json(
        { error: "Workspace access is required." },
        { status: 403 },
      ),
    };
  }

  return {
    actor: authentication.role,
    user: authentication.user,
  };
}

export async function authorizeAdmin(
  request,
  { allowReminderKey = false } = {},
) {
  const token = bearerToken(request);

  if (allowReminderKey && secretMatches(token, process.env.REMINDER_API_KEY)) {
    return { actor: "scheduler", user: null };
  }

  const authentication = await authenticatedUser(request);
  if (authentication.error) return authentication;

  if (authentication.role !== "admin") {
    return {
      error: Response.json(
        { error: "Administrator access is required." },
        { status: 403 },
      ),
    };
  }

  return { actor: "admin", user: authentication.user };
}
