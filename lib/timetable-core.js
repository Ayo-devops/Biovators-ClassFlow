const LAGOS_TIME_ZONE = "Africa/Lagos";

export function isDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

export function addDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function dayOfWeek(dateString) {
  const day = new Date(`${dateString}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function timeToMinutes(value) {
  const [hours, minutes] = String(value || "")
    .slice(0, 5)
    .split(":")
    .map(Number);
  return hours * 60 + minutes;
}

export function formatTime(value) {
  const total = timeToMinutes(value);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(startTime, endTime) {
  return `${formatTime(startTime)}–${formatTime(endTime)}`;
}

export function formatScheduleDate(dateString) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LAGOS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateString}T12:00:00Z`));
}

export function lagosNowParts(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: LAGOS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    time: `${parts.hour}:${parts.minute}`,
  };
}

function sameId(left, right) {
  return String(left || "") === String(right || "");
}

function baseOccurrence(entry, date) {
  return {
    ...entry,
    occurrence_date: date,
    status: "scheduled",
    changed: false,
    note: "",
  };
}

function applyChange(occurrence, change, date) {
  if (change.change_type === "cancelled") {
    return {
      ...occurrence,
      status: "cancelled",
      changed: true,
      note: change.note || "",
      change_id: change.id,
    };
  }

  if (
    change.change_type === "moved" &&
    change.moved_to_date &&
    change.moved_to_date !== date
  ) {
    return {
      ...occurrence,
      status: "moved_out",
      changed: true,
      moved_to_date: change.moved_to_date,
      new_start_time: change.new_start_time,
      new_end_time: change.new_end_time,
      new_venue: change.new_venue,
      note: change.note || "",
      change_id: change.id,
    };
  }

  return {
    ...occurrence,
    start_time: change.new_start_time || occurrence.start_time,
    end_time: change.new_end_time || occurrence.end_time,
    venue: change.new_venue || occurrence.venue,
    course_code: change.course_code || occurrence.course_code,
    course_title: change.course_title || occurrence.course_title,
    status: change.change_type === "moved" ? "moved" : "changed",
    changed: true,
    note: change.note || "",
    change_id: change.id,
  };
}

export function resolveSchedule({
  date,
  entries = [],
  changes = [],
  settings = {},
}) {
  if (!isDateString(date)) throw new Error("A valid schedule date is required.");
  if (dayOfWeek(date) > 5 || (settings.skip_dates || []).includes(date)) {
    return [];
  }

  const weekday = dayOfWeek(date);
  const activeEntries = entries.filter((entry) => entry.active !== false);
  const baseForDay = activeEntries.filter(
    (entry) => Number(entry.day_of_week) === weekday,
  );
  const result = baseForDay.map((entry) => {
    const occurrence = baseOccurrence(entry, date);
    const applicable = changes
      .filter(
        (change) =>
          change.change_date === date && sameId(change.entry_id, entry.id),
      )
      .sort((left, right) =>
        String(left.created_at || "").localeCompare(
          String(right.created_at || ""),
        ),
      );
    return applicable.reduce(
      (current, change) => applyChange(current, change, date),
      occurrence,
    );
  });

  for (const change of changes) {
    if (change.change_type === "added" && change.change_date === date) {
      result.push({
        id: `added:${change.id}`,
        occurrence_date: date,
        start_time: change.new_start_time,
        end_time: change.new_end_time,
        course_code: change.course_code,
        course_title: change.course_title,
        venue: change.new_venue,
        status: "added",
        changed: true,
        note: change.note || "",
        change_id: change.id,
      });
    }

    if (
      change.change_type === "moved" &&
      change.moved_to_date === date &&
      change.change_date !== date
    ) {
      const entry = activeEntries.find((item) =>
        sameId(item.id, change.entry_id),
      );
      if (!entry) continue;
      result.push({
        ...baseOccurrence(entry, date),
        id: `moved:${change.id}`,
        start_time: change.new_start_time || entry.start_time,
        end_time: change.new_end_time || entry.end_time,
        venue: change.new_venue || entry.venue,
        course_code: change.course_code || entry.course_code,
        course_title: change.course_title || entry.course_title,
        status: "moved",
        changed: true,
        note: change.note || "",
        change_id: change.id,
        moved_from_date: change.change_date,
      });
    }
  }

  return result.sort(
    (left, right) =>
      timeToMinutes(left.start_time) - timeToMinutes(right.start_time) ||
      String(left.course_code).localeCompare(String(right.course_code)),
  );
}

function dailyScheduleLine(item) {
  const label = `${item.course_code} · ${item.course_title}`;
  if (item.status === "cancelled") {
    return `❌ CANCELLED: ${formatTimeRange(item.start_time, item.end_time)}  ${label}${
      item.note ? ` — ${item.note}` : ""
    }`;
  }
  if (item.status === "moved_out") {
    const destination = item.moved_to_date
      ? formatScheduleDate(item.moved_to_date)
      : "another time";
    const nextTime = item.new_start_time
      ? ` at ${formatTime(item.new_start_time)}`
      : "";
    return `⚠️ CHANGED: ${label} moved to ${destination}${nextTime}`;
  }
  const prefix = item.changed ? "⚠️ CHANGED: " : "";
  return `${prefix}${formatTimeRange(item.start_time, item.end_time)}  ${label} (${item.venue})${
    item.note ? ` — ${item.note}` : ""
  }`;
}

export function formatDailySchedule(kind, date, schedule) {
  const title = kind === "evening" ? "Tomorrow's Schedule" : "Today's Schedule";
  if (!schedule.length) return "";
  return (
    `📅 ${title} — ${formatScheduleDate(date)}\n\n` +
    schedule.map(dailyScheduleLine).join("\n") +
    "\n\nClassFlow — Biovators, connected."
  );
}

export function formatUpcomingClass(item, leadMinutes = 10) {
  if (!item || ["cancelled", "moved_out"].includes(item.status)) return "";
  return (
    `⏰ Class Starting Soon — in ${leadMinutes} minute${
      leadMinutes === 1 ? "" : "s"
    }\n\n` +
    `${item.course_code} · ${item.course_title}\n` +
    `🕛 ${formatTimeRange(item.start_time, item.end_time)}  |  📌 ${item.venue}` +
    (item.changed ? "\n⚠️ This class has a timetable change." : "") +
    (item.note ? `\n${item.note}` : "") +
    "\n\nClassFlow — Biovators, connected."
  );
}

export function isDue(currentMinutes, scheduledMinutes, graceMinutes) {
  const difference = currentMinutes - scheduledMinutes;
  return difference >= 0 && difference <= graceMinutes;
}

export { LAGOS_TIME_ZONE };
