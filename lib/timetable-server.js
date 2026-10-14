import "server-only";

import { createClient } from "@supabase/supabase-js";
import { addDays, resolveSchedule } from "./timetable-core";

export const timetableSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      )
    : null;

export const DEFAULT_TIMETABLE_SETTINGS = {
  id: true,
  auto_send_enabled: false,
  evening_enabled: true,
  morning_enabled: true,
  class_now_enabled: true,
  class_now_lead_minutes: 10,
  evening_time: "19:00",
  morning_time: "06:00",
  target_group_id: "",
  target_group_name: "",
  skip_dates: [],
  grace_minutes: 10,
};

export function timetableUnavailable() {
  return Response.json(
    { error: "Timetable data is not configured yet." },
    { status: 503 },
  );
}

function throwIfError(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data || [];
}

export async function loadTimetableSettings() {
  const result = await timetableSupabase
    .from("timetable_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return { ...DEFAULT_TIMETABLE_SETTINGS, ...(result.data || {}) };
}

export async function loadTimetableData(fromDate, toDate = fromDate) {
  const [entriesResult, changesResult, settings] = await Promise.all([
    timetableSupabase
      .from("timetable_entries")
      .select("*")
      .order("day_of_week")
      .order("start_time"),
    timetableSupabase
      .from("timetable_changes")
      .select("*")
      .or(
        `and(change_date.gte.${fromDate},change_date.lte.${toDate}),and(moved_to_date.gte.${fromDate},moved_to_date.lte.${toDate})`,
      )
      .order("created_at"),
    loadTimetableSettings(),
  ]);

  return {
    entries: throwIfError(entriesResult),
    changes: throwIfError(changesResult),
    settings,
  };
}

export async function resolveScheduleFromDatabase(date) {
  const data = await loadTimetableData(date, date);
  return {
    date,
    schedule: resolveSchedule({ date, ...data }),
    settings: data.settings,
  };
}

export async function resolvedScheduleRange(fromDate, days = 14) {
  const toDate = addDays(fromDate, days - 1);
  const data = await loadTimetableData(fromDate, toDate);
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(fromDate, index);
    return {
      date,
      schedule: resolveSchedule({ date, ...data }),
    };
  });
}
