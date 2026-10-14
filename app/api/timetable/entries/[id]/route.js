import { authorizeAdmin } from "../../../../../lib/admin-auth";
import {
  timetableSupabase,
  timetableUnavailable,
} from "../../../../../lib/timetable-server";
import {
  entryFromBody,
  invalidEntry,
} from "../../../../../lib/timetable-validation";

export async function PATCH(request, { params }) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  try {
    const { id } = await params;
    const entry = entryFromBody(await request.json());
    if (invalidEntry(entry)) {
      return Response.json(
        { error: "Complete the day, time, course, title, and venue correctly." },
        { status: 400 },
      );
    }
    const { data, error } = await timetableSupabase
      .from("timetable_entries")
      .update(entry)
      .eq("id", id)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  const { id } = await params;
  const { error } = await timetableSupabase
    .from("timetable_entries")
    .delete()
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
