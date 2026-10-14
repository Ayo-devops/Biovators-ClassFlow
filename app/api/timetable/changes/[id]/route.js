import { authorizeWorkspaceMember } from "../../../../../lib/admin-auth";
import {
  timetableSupabase,
  timetableUnavailable,
} from "../../../../../lib/timetable-server";

export async function DELETE(request, { params }) {
  const authorization = await authorizeWorkspaceMember(request);
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  const { id } = await params;
  const { error } = await timetableSupabase
    .from("timetable_changes")
    .delete()
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
