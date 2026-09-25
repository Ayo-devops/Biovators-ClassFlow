import { createClient } from "@supabase/supabase-js";
import { authorizeAdmin } from "../../../lib/admin-auth";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
    : null;

export async function GET(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  return Response.json({ role: "admin" });
}

export async function POST(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!supabase)
    return Response.json(
      { error: "Class data is not configured yet." },
      { status: 503 },
    );
  try {
    const { email, role } = await request.json();
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !["admin", "rep"].includes(role)) {
      return Response.json(
        { error: "A valid email and workspace role are required." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      normalizedEmail,
      { data: { role } },
    );

    let invitedUser = data?.user;
    let existing = false;
    if (error) {
      // Supabase does not provide a get-user-by-email admin endpoint. If the
      // invite failed because the account already exists, find it safely and
      // promote its app role instead of rejecting the administrator's action.
      const perPage = 1000;
      for (let page = 1; page <= 100 && !invitedUser; page += 1) {
        const result = await supabase.auth.admin.listUsers({ page, perPage });
        if (result.error) {
          return Response.json(
            { error: result.error.message },
            { status: 500 },
          );
        }
        invitedUser = result.data.users.find(
          (user) => user.email?.toLowerCase() === normalizedEmail,
        );
        if (result.data.users.length < perPage) break;
      }
      if (!invitedUser) {
        return Response.json({ error: error.message }, { status: 500 });
      }
      existing = true;
    }

    if (!invitedUser) {
      return Response.json(
        { error: "The invitation did not create a user." },
        { status: 500 },
      );
    }

    const { error: roleError } = await supabase.auth.admin.updateUserById(
      invitedUser.id,
      { app_metadata: { ...invitedUser.app_metadata, role } },
    );
    if (roleError) {
      return Response.json({ error: roleError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      existing,
      message: existing
        ? "Existing account access updated successfully."
        : "Invitation sent successfully.",
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
