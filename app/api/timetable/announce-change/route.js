import { authorizeWorkspaceMember } from "../../../../lib/admin-auth";
import {
  formatDailySchedule,
  isDateString,
} from "../../../../lib/timetable-core";
import {
  resolveScheduleFromDatabase,
  timetableSupabase,
  timetableUnavailable,
} from "../../../../lib/timetable-server";
import {
  listWhatsAppGroups,
  sendWhatsAppGroup,
} from "../../../../lib/whatsapp-server";

async function correctionForDate(date) {
  const { schedule, settings } = await resolveScheduleFromDatabase(date);
  const daily = formatDailySchedule("morning", date, schedule);
  return {
    settings,
    message: daily ? `🔔 Timetable Update\n\n${daily}` : "",
  };
}

export async function GET(request) {
  const authorization = await authorizeWorkspaceMember(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  const date = new URL(request.url).searchParams.get("date");
  if (!isDateString(date)) {
    return Response.json({ error: "Choose a valid date." }, { status: 400 });
  }
  try {
    const { settings, message } = await correctionForDate(date);
    return Response.json({
      dryRun: true,
      date,
      group: settings.target_group_name || null,
      message,
      skipped: !message,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authorization = await authorizeWorkspaceMember(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  try {
    const { date, confirm } = await request.json();
    if (!isDateString(date) || confirm !== true) {
      return Response.json(
        { error: "A valid date and explicit confirmation are required." },
        { status: 400 },
      );
    }
    const { settings, message } = await correctionForDate(date);
    if (!message) {
      return Response.json(
        { error: "There is no schedule to announce for that date." },
        { status: 409 },
      );
    }
    const { groups = [] } = await listWhatsAppGroups();
    const group = groups.find((item) => item.id === settings.target_group_id);
    if (!group) {
      return Response.json(
        { error: "The selected timetable group is not available." },
        { status: 409 },
      );
    }
    await sendWhatsAppGroup(group.id, message);
    return Response.json({ success: true, group: group.name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
