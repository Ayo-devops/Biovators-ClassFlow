import { createClient } from "@supabase/supabase-js";
import { authorizeAdmin } from "../../../../lib/admin-auth";
import { FILE_BUCKET, filesSupabase } from "../../../../lib/class-files-server";

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
  const id = (await params).id;
  if (filesSupabase) {
    const { data: files } = await filesSupabase
      .from("assignment_files")
      .select("storage_path")
      .eq("assignment_id", id);
    if (files?.length) {
      await filesSupabase.storage.from(FILE_BUCKET).remove(files.map((file) => file.storage_path));
    }
  }
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", id);

  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ success: true });
}
