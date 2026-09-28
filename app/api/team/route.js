import { createClient } from "@supabase/supabase-js";
import { authorizeSuperAdmin } from "../../../lib/admin-auth";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      )
    : null;

async function workspaceUsers() {
  const users = [];
  const perPage = 1000;
  for (let page = 1; page <= 100; page += 1) {
    const result = await supabase.auth.admin.listUsers({ page, perPage });
    if (result.error) throw result.error;
    users.push(...result.data.users);
    if (result.data.users.length < perPage) break;
  }
  return users;
}

export async function GET(request) {
  const authorization = await authorizeSuperAdmin(request);
  if (authorization.error) return authorization.error;
  if (!supabase) {
    return Response.json(
      { error: "Workspace authentication is not configured." },
      { status: 503 },
    );
  }

  try {
    const users = await workspaceUsers();
    return Response.json(
      users
        .filter((user) => ["admin", "rep"].includes(user.app_metadata?.role))
        .map((user) => ({
          id: user.id,
          email: user.email,
          role: user.app_metadata.role,
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at,
        }))
        .sort((a, b) => (a.email || "").localeCompare(b.email || "")),
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const authorization = await authorizeSuperAdmin(request);
  if (authorization.error) return authorization.error;
  if (!supabase) {
    return Response.json(
      { error: "Workspace authentication is not configured." },
      { status: 503 },
    );
  }

  try {
    const { userId } = await request.json();
    if (!userId || userId === authorization.user.id) {
      return Response.json(
        { error: "Choose another workspace member to revoke." },
        { status: 400 },
      );
    }
    const { data, error: userError } =
      await supabase.auth.admin.getUserById(userId);
    if (userError || !data.user) {
      return Response.json({ error: "Workspace member not found." }, { status: 404 });
    }
    if (!["admin", "rep"].includes(data.user.app_metadata?.role)) {
      return Response.json(
        { error: "This account does not currently have a revocable workspace role." },
        { status: 400 },
      );
    }

    const nextMetadata = { ...data.user.app_metadata };
    delete nextMetadata.role;
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: nextMetadata,
    });
    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
