import { authorizeAdmin } from "../../../../lib/admin-auth";
import { filesSupabase } from "../../../../lib/class-files-server";
import { processMaterialForAi } from "../../../../lib/material-ai-server";

export const maxDuration = 60;

export async function POST(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!filesSupabase) {
    return Response.json({ error: "File storage is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  let query = filesSupabase
    .from("course_materials")
    .select("id, storage_path, file_name, mime_type")
    .order("created_at", { ascending: false })
    .limit(8);
  if (body.materialId) query = query.eq("id", body.materialId);
  const { data: materials, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const material of materials || []) {
    results.push({ id: material.id, ...(await processMaterialForAi(material)) });
  }
  return Response.json({
    processed: results.filter((item) => item.status === "ready").length,
    unsupported: results.filter((item) => item.status === "unsupported").length,
    failed: results.filter((item) => item.status === "failed").length,
    results,
  });
}
