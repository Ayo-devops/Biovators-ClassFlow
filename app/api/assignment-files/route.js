import { authorizeWorkspaceMember } from "../../../lib/admin-auth";
import { filesSupabase, signedFiles } from "../../../lib/class-files-server";

export async function GET(request) {
  if (!filesSupabase) return Response.json([]);
  const assignmentId = new URL(request.url).searchParams.get("assignmentId");
  if (!assignmentId) return Response.json({ error: "Assignment is required." }, { status: 400 });
  const { data, error } = await filesSupabase
    .from("assignment_files")
    .select("id, assignment_id, file_name, storage_path, mime_type, file_size, created_at")
    .eq("assignment_id", assignmentId)
    .order("created_at");
  if (error) return Response.json([]);
  return Response.json(await signedFiles(data));
}

export async function POST(request) {
  const authorization = await authorizeWorkspaceMember(request);
  if (authorization.error) return authorization.error;
  if (!filesSupabase) return Response.json({ error: "File storage is not configured." }, { status: 503 });
  const body = await request.json();
  if (!body.assignmentId || !body.path || !body.fileName || !body.fileType || !body.fileSize) {
    return Response.json({ error: "File details are incomplete." }, { status: 400 });
  }
  const { data, error } = await filesSupabase.from("assignment_files").insert({
    assignment_id: body.assignmentId,
    file_name: body.fileName,
    storage_path: body.path,
    mime_type: body.fileType,
    file_size: body.fileSize,
    uploaded_by: authorization.user.id,
  }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
