import { authorizeWorkspaceMember } from "../../../../lib/admin-auth";
import {
  FILE_BUCKET,
  filesSupabase,
  makeStoragePath,
  validateFileDetails,
} from "../../../../lib/class-files-server";

export async function POST(request) {
  const authorization = await authorizeWorkspaceMember(request);
  if (authorization.error) return authorization.error;
  if (!filesSupabase) {
    return Response.json({ error: "File storage is not configured." }, { status: 503 });
  }

  const body = await request.json();
  const validationError = validateFileDetails(body);
  if (validationError) return Response.json({ error: validationError }, { status: 400 });
  if (!["assignment", "material", "test-assignment"].includes(body.kind)) {
    return Response.json({ error: "Choose where this file belongs." }, { status: 400 });
  }
  if (body.kind === "test-assignment" && !["super_admin", "admin"].includes(authorization.actor)) {
    return Response.json({ error: "Administrator access is required for private delivery tests." }, { status: 403 });
  }
  if (body.kind === "material" && !["super_admin", "admin"].includes(authorization.actor)) {
    return Response.json({ error: "Administrator access is required to upload study materials." }, { status: 403 });
  }

  const folder = body.kind === "assignment"
    ? `assignments-${body.assignmentId || "new"}`
    : body.kind === "test-assignment"
      ? "test-assignments"
      : `materials-${body.courseCode || "course"}`;
  const path = makeStoragePath(folder, body.fileName);
  const { data, error } = await filesSupabase.storage
    .from(FILE_BUCKET)
    .createSignedUploadUrl(path);
  if (error) {
    return Response.json(
      { error: "File uploads are not ready. Run the ClassFlow files SQL in Supabase first." },
      { status: 503 },
    );
  }
  return Response.json({ path, token: data.token });
}
