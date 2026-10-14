import { authorizeWorkspaceMember } from "../../../../lib/admin-auth";
import {
  formatDailySchedule,
  formatUpcomingClass,
  isDateString,
} from "../../../../lib/timetable-core";
import {
  resolveScheduleFromDatabase,
  timetableSupabase,
  timetableUnavailable,
} from "../../../../lib/timetable-server";

export async function GET(request) {
  const authorization = await authorizeWorkspaceMember(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const kind = params.get("kind") || "morning";
  if (!isDateString(date) || !["evening", "morning", "class_now"].includes(kind)) {
    return Response.json(
      { error: "Choose a valid date and preview type." },
      { status: 400 },
    );
  }

  try {
    const { schedule, settings } = await resolveScheduleFromDatabase(date);
    if (kind === "class_now") {
      const messages = schedule
        .filter((item) => !["cancelled", "moved_out"].includes(item.status))
        .map((item) => ({
          slot: `${item.start_time.slice(0, 5)} · ${item.course_code}`,
          message: formatUpcomingClass(
            item,
            settings.class_now_lead_minutes,
          ),
        }));
      return Response.json({
        dryRun: true,
        kind,
        date,
        leadMinutes: settings.class_now_lead_minutes,
        messages,
      });
    }

    return Response.json({
      dryRun: true,
      kind,
      date,
      message: formatDailySchedule(kind, date, schedule),
      skipped: schedule.length === 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
