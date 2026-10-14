import { authorizeAdmin } from "../../../../lib/admin-auth";
import {
  timetableSupabase,
  timetableUnavailable,
} from "../../../../lib/timetable-server";
import {
  entryFromBody,
  invalidEntry,
} from "../../../../lib/timetable-validation";

export async function GET(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  const { data, error } = await timetableSupabase
    .from("timetable_entries")
    .select("*")
    .order("day_of_week")
    .order("start_time");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  try {
    const entry = entryFromBody(await request.json());
    if (invalidEntry(entry)) {
      return Response.json(
        { error: "Complete the day, time, course, title, and venue correctly." },
        { status: 400 },
      );
    }
    const { data, error } = await timetableSupabase
      .from("timetable_entries")
      .insert(entry)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
