import {
  timetableSupabase,
  timetableUnavailable,
} from "../../../../lib/timetable-server";

export async function GET() {
  if (!timetableSupabase) return timetableUnavailable();

  const { data, error } = await timetableSupabase
    .from("timetable_entries")
    .select(
      "id,day_of_week,start_time,end_time,course_code,course_title,venue,lecturer",
    )
    .eq("active", true)
    .order("day_of_week")
    .order("start_time");

  if (error) {
    return Response.json(
      { error: "The timetable could not be loaded." },
      { status: 500 },
    );
  }

  return Response.json(data, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
