import { authorizeAdmin } from "../../../../lib/admin-auth";
import { pilotDatabase } from "../../../../lib/pilot-server";

export async function PUT(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  try {
    const body = await request.json();
    const eligible = body.eligibleStudents === "" || body.eligibleStudents == null ? null : Number(body.eligibleStudents);
    const record = {
      id: true,
      pilot_name: String(body.pilotName || "").trim().slice(0, 120),
      pilot_start: String(body.pilotStart || ""),
      pilot_end: body.pilotEnd ? String(body.pilotEnd) : null,
      eligible_students: eligible,
      updated_at: new Date().toISOString(),
    };
    if (!record.pilot_name || !/^\d{4}-\d{2}-\d{2}$/.test(record.pilot_start) || (record.pilot_end && !/^\d{4}-\d{2}-\d{2}$/.test(record.pilot_end)) || (eligible != null && (!Number.isInteger(eligible) || eligible < 1))) {
      return Response.json({ error: "Enter valid pilot settings." }, { status: 400 });
    }
    const { data, error } = await pilotDatabase().from("pilot_settings").upsert(record).select("*").single();
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503 });
  }
}
