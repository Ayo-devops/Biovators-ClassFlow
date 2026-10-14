import { authorizeAdmin } from "../../../../lib/admin-auth";
import {
  loadTimetableSettings,
  timetableSupabase,
  timetableUnavailable,
} from "../../../../lib/timetable-server";

export async function GET(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  try {
    return Response.json(await loadTimetableSettings());
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  try {
    const body = await request.json();
    const lead = Number(body.class_now_lead_minutes);
    const grace = Number(body.grace_minutes);
    const settings = {
      id: true,
      auto_send_enabled: Boolean(body.auto_send_enabled),
      evening_enabled: Boolean(body.evening_enabled),
      morning_enabled: Boolean(body.morning_enabled),
      class_now_enabled: Boolean(body.class_now_enabled),
      class_now_lead_minutes: lead,
      evening_time: body.evening_time,
      morning_time: body.morning_time,
      target_group_id: body.target_group_id?.trim() || "",
      target_group_name: body.target_group_name?.trim() || "",
      skip_dates: Array.isArray(body.skip_dates)
        ? body.skip_dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
        : [],
      grace_minutes: grace,
      updated_at: new Date().toISOString(),
    };

    if (
      !Number.isInteger(lead) ||
      lead < 0 ||
      lead > 60 ||
      !Number.isInteger(grace) ||
      grace < 1 ||
      grace > 30 ||
      !/^\d{2}:\d{2}/.test(settings.evening_time || "") ||
      !/^\d{2}:\d{2}/.test(settings.morning_time || "") ||
      (settings.target_group_id &&
        !settings.target_group_id.endsWith("@g.us"))
    ) {
      return Response.json(
        { error: "Review the timetable settings and try again." },
        { status: 400 },
      );
    }

    const { data, error } = await timetableSupabase
      .from("timetable_settings")
      .upsert(settings)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
