import { createClient } from "@supabase/supabase-js";
import { authorizeAdmin } from "../../../lib/admin-auth";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
    : null;

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
    if (!email || !["admin", "rep"].includes(role)) {
      return Response.json(
        { error: "A valid email and workspace role are required." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role },
    });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    const invitedUser = data.user;
    if (!invitedUser) {
      return Response.json({ error: "The invitation did not create a user." }, { status: 500 });
    }

    const { error: roleError } = await supabase.auth.admin.updateUserById(
      invitedUser.id,
      { app_metadata: { ...invitedUser.app_metadata, role } },
    );
    if (roleError) {
      return Response.json({ error: roleError.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
