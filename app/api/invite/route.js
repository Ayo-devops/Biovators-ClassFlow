import { createClient } from "@supabase/supabase-js";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
    : null;

export async function POST(request) {
  if (!supabase)
    return Response.json(
      { error: "Class data is not configured yet." },
      { status: 503 },
    );
  try {
    const { email, role } = await request.json();

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role: role },
    });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true, user: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
