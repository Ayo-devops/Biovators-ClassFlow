export function entryFromBody(body) {
  return {
    day_of_week: Number(body.day_of_week),
    start_time: body.start_time,
    end_time: body.end_time,
    course_code: body.course_code?.trim(),
    course_title: body.course_title?.trim(),
    venue: body.venue?.trim(),
    lecturer: body.lecturer?.trim() || null,
    active: body.active !== false,
    updated_at: new Date().toISOString(),
  };
}

export function invalidEntry(entry) {
  return (
    !Number.isInteger(entry.day_of_week) ||
    entry.day_of_week < 1 ||
    entry.day_of_week > 5 ||
    !/^\d{2}:\d{2}/.test(entry.start_time || "") ||
    !/^\d{2}:\d{2}/.test(entry.end_time || "") ||
    entry.end_time <= entry.start_time ||
    !entry.course_code ||
    !entry.course_title ||
    !entry.venue
  );
}
