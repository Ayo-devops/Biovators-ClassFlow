import { createClient } from "@supabase/supabase-js";
import { authorizeAdmin } from "../../../../lib/admin-auth";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
    : null;

export async function DELETE(request, { params }) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!supabase)
    return Response.json(
      { error: "Class data is not configured yet." },
      { status: 503 },
    );
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", (await params).id);

  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ success: true });
}
