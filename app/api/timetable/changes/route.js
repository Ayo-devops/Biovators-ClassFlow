import { authorizeWorkspaceMember } from "../../../../lib/admin-auth";
import { isDateString } from "../../../../lib/timetable-core";
import {
  timetableSupabase,
  timetableUnavailable,
} from "../../../../lib/timetable-server";

async function changePayload(body, email) {
  const type = body.change_type;
  const payload = {
    change_date: body.change_date,
    moved_to_date: type === "moved" ? body.moved_to_date : null,
    entry_id: type === "added" ? null : Number(body.entry_id),
    change_type: type,
    new_start_time:
      ["moved", "added"].includes(type) ? body.new_start_time : null,
    new_end_time: ["moved", "added"].includes(type) ? body.new_end_time : null,
    new_venue:
      ["moved", "venue_changed", "added"].includes(type)
        ? body.new_venue?.trim()
        : null,
    course_code: type === "added" ? body.course_code?.trim() : null,
    course_title: type === "added" ? body.course_title?.trim() : null,
    note: body.note?.trim() || null,
    created_by: email,
  };

  const invalid =
    !["cancelled", "moved", "venue_changed", "added"].includes(type) ||
    !isDateString(payload.change_date) ||
    (type !== "added" &&
      (!Number.isInteger(payload.entry_id) || payload.entry_id < 1)) ||
    (type === "moved" &&
      (!isDateString(payload.moved_to_date) ||
        !payload.new_start_time ||
        !payload.new_end_time)) ||
    (type === "venue_changed" && !payload.new_venue) ||
    (type === "added" &&
      (!payload.new_start_time ||
        !payload.new_end_time ||
        !payload.new_venue ||
        !payload.course_code ||
        !payload.course_title));

  if (invalid) return null;
  return payload;
}

export async function GET(request) {
  const authorization = await authorizeWorkspaceMember(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  const [entriesResult, changesResult] = await Promise.all([
    timetableSupabase
      .from("timetable_entries")
      .select("*")
      .eq("active", true)
      .order("day_of_week")
      .order("start_time"),
    timetableSupabase
      .from("timetable_changes")
      .select("*")
      .order("change_date", { ascending: false })
      .limit(100),
  ]);
  const error = entriesResult.error || changesResult.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    entries: entriesResult.data || [],
    changes: changesResult.data || [],
  });
}

export async function POST(request) {
  const authorization = await authorizeWorkspaceMember(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  try {
    const payload = await changePayload(
      await request.json(),
      authorization.user.email || authorization.user.id,
    );
    if (!payload) {
      return Response.json(
        { error: "Complete the required change details correctly." },
        { status: 400 },
      );
    }
    const { data, error } = await timetableSupabase
      .from("timetable_changes")
      .insert(payload)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
