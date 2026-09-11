import { createClient } from "@supabase/supabase-js";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
    : null;

export async function DELETE(request, { params }) {
  if (!supabase)
    return Response.json(
      { error: "Class data is not configured yet." },
      { status: 503 },
    );
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", (await params).id);

  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ success: true });
}
