import { authorizeAdmin } from "../../../../lib/admin-auth";
import {
  pilotDatabase,
  startDate,
  summariseEvents,
} from "../../../../lib/pilot-server";

export async function GET(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;

  try {
    const supabase = pilotDatabase();
    const since = startDate(7);
    const retentionCutoff = startDate(91);
    const [eventsResult, feedbackResult, settingsResult, studentsResult] = await Promise.all([
      supabase
        .from("pilot_events")
        .select("device_hash,event_type,path,event_day")
        .gte("event_day", since)
        .order("event_day", { ascending: true }),
      supabase
        .from("pilot_feedback")
        .select("id,status,severity,minutes_spent,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("pilot_settings").select("*").eq("id", true).single(),
      supabase.from("students").select("student_email,phone_number"),
    ]);

    for (const result of [eventsResult, feedbackResult, settingsResult, studentsResult]) {
      if (result.error) throw result.error;
    }

    const { error: retentionError } = await supabase
      .from("pilot_events")
      .delete()
      .lt("event_day", retentionCutoff);
    if (retentionError) console.error("Pilot event retention cleanup failed:", retentionError.message);

    const feedback = feedbackResult.data || [];
    const students = studentsResult.data || [];
    return Response.json({
      period: { days: 7, since },
      settings: settingsResult.data,
      usage: summariseEvents(eventsResult.data || []),
      reach: {
        registered: students.length,
        email: students.filter((item) => item.student_email).length,
        whatsapp: students.filter((item) => item.phone_number).length,
      },
      feedback: {
        total: feedback.length,
        open: feedback.filter((item) => ["new", "investigating"].includes(item.status)).length,
        criticalOpen: feedback.filter((item) => item.severity === "critical" && ["new", "investigating"].includes(item.status)).length,
        minutesSpent: feedback.reduce((sum, item) => sum + (item.minutes_spent || 0), 0),
      },
      privacy: "Anonymous daily feature reach only. No names, contacts, IP addresses, message text or AI prompts are recorded.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503 });
  }
}
