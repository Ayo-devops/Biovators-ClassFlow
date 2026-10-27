import { authorizeAdmin } from "../../../../lib/admin-auth";
import { pilotDatabase } from "../../../../lib/pilot-server";

const TYPES = new Set(["feedback", "suggestion", "bug", "incorrect_information", "delivery_failure", "support_request"]);
const SEVERITIES = new Set(["minor", "disruptive", "critical"]);
const STATUSES = new Set(["new", "investigating", "resolved", "deferred", "declined"]);
const SOURCES = new Set(["student", "course_rep", "administrator", "automatic_monitoring"]);

export async function GET(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  try {
    const { data, error } = await pilotDatabase()
      .from("pilot_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return Response.json(data || []);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503 });
  }
}

export async function POST(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  try {
    const body = await request.json();
    const record = {
      feedback_type: String(body.feedbackType || ""),
      area: String(body.area || "").trim().slice(0, 80),
      summary: String(body.summary || "").trim().slice(0, 1000),
      severity: String(body.severity || ""),
      source: String(body.source || ""),
      affected_students: body.affectedStudents === "" || body.affectedStudents == null ? null : Number(body.affectedStudents),
      created_by: authorization.user?.id || null,
      created_by_role: authorization.actor,
    };
    if (!TYPES.has(record.feedback_type) || !SEVERITIES.has(record.severity) || !SOURCES.has(record.source) || !record.area || !record.summary || (record.affected_students != null && (!Number.isInteger(record.affected_students) || record.affected_students < 0))) {
      return Response.json({ error: "Complete the required feedback fields." }, { status: 400 });
    }
    const { data, error } = await pilotDatabase().from("pilot_feedback").insert(record).select("*").single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503 });
  }
}

export async function PATCH(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  try {
    const body = await request.json();
    const id = String(body.id || "");
    const status = String(body.status || "");
    const resolution = String(body.resolution || "").trim().slice(0, 1000);
    const minutesSpent = body.minutesSpent === "" || body.minutesSpent == null ? null : Number(body.minutesSpent);
    if (!id || !STATUSES.has(status) || (minutesSpent != null && (!Number.isInteger(minutesSpent) || minutesSpent < 0))) {
      return Response.json({ error: "Invalid feedback update." }, { status: 400 });
    }
    const { data, error } = await pilotDatabase()
      .from("pilot_feedback")
      .update({
        status,
        resolution: resolution || null,
        minutes_spent: minutesSpent,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503 });
  }
}
