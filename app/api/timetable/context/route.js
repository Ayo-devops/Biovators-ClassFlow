import { addDays, lagosNowParts } from "../../../../lib/timetable-core";
import {
  resolvedScheduleRange,
  timetableSupabase,
  timetableUnavailable,
} from "../../../../lib/timetable-server";

export async function GET() {
  if (!timetableSupabase) return timetableUnavailable();

  try {
    const now = lagosNowParts();
    const days = await resolvedScheduleRange(now.date, 14);
    return Response.json({
      timeZone: "Africa/Lagos",
      currentDate: now.date,
      currentTime: now.time,
      throughDate: addDays(now.date, 13),
      days,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
