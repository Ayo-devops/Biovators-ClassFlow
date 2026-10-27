import "server-only";

import { createClient } from "@supabase/supabase-js";

export const PILOT_EVENT_TYPES = new Set([
  "page_view",
  "assignment_open",
  "assignment_marked_done",
  "material_download",
  "reminder_registered",
  "app_install_requested",
  "app_installed",
]);

export const PUBLIC_PATHS = new Set([
  "/",
  "/assignments",
  "/announcements",
  "/materials",
  "/reminders",
  "/register",
  "/update-phone",
]);

export function pilotDatabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error("Pilot measurement is not configured.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function lagosDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function startDate(days, value = new Date()) {
  return lagosDate(new Date(value.getTime() - (days - 1) * 86400000));
}

export function summariseEvents(events) {
  const devices = new Set();
  const byPath = {};
  const byType = {};
  const byDay = {};

  for (const event of events) {
    devices.add(event.device_hash);
    byPath[event.path] = (byPath[event.path] || 0) + 1;
    byType[event.event_type] = (byType[event.event_type] || 0) + 1;
    byDay[event.event_day] = byDay[event.event_day] || new Set();
    byDay[event.event_day].add(event.device_hash);
  }

  return {
    activeDevices: devices.size,
    byPath,
    byType,
    dailyActiveDevices: Object.fromEntries(
      Object.entries(byDay).map(([day, values]) => [day, values.size]),
    ),
  };
}
