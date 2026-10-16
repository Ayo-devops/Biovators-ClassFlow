import { authorizeAdmin } from "../../../lib/admin-auth";
import { filesSupabase, signedFiles } from "../../../lib/class-files-server";

export async function GET() {
  if (!filesSupabase) return Response.json([]);
  const { data, error } = await filesSupabase
    .from("course_materials")
    .select("id, course_code, course_title, title, description, file_name, storage_path, mime_type, file_size, created_at")
    .order("course_code")
    .order("created_at", { ascending: false });
  if (error) return Response.json([]);
  return Response.json(await signedFiles(data));
}

export async function POST(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!filesSupabase) return Response.json({ error: "File storage is not configured." }, { status: 503 });
  const body = await request.json();
  const required = ["courseCode", "courseTitle", "title", "fileName", "path", "fileType", "fileSize"];
  if (required.some((field) => !body[field])) {
    return Response.json({ error: "Complete the course and file details." }, { status: 400 });
  }
  const { data, error } = await filesSupabase.from("course_materials").insert({
    course_code: body.courseCode.trim(),
    course_title: body.courseTitle.trim(),
    title: body.title.trim(),
    description: body.description?.trim() || null,
    file_name: body.fileName,
    storage_path: body.path,
    mime_type: body.fileType,
    file_size: body.fileSize,
    uploaded_by: authorization.user.id,
  }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
