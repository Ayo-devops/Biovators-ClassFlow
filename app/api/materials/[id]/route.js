import { authorizeAdmin } from "../../../../lib/admin-auth";
import { FILE_BUCKET, filesSupabase } from "../../../../lib/class-files-server";

export async function DELETE(request, { params }) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!filesSupabase) return Response.json({ error: "File storage is not configured." }, { status: 503 });
  const id = (await params).id;
  const { data: material, error: findError } = await filesSupabase
    .from("course_materials").select("storage_path").eq("id", id).single();
  if (findError) return Response.json({ error: "Material not found." }, { status: 404 });
  const { error: storageError } = await filesSupabase.storage.from(FILE_BUCKET).remove([material.storage_path]);
  if (storageError) return Response.json({ error: storageError.message }, { status: 500 });
  const { error } = await filesSupabase.from("course_materials").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
