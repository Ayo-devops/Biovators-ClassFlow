import assert from "node:assert/strict";
import {
  formatDailySchedule,
  formatUpcomingClass,
  isDue,
  resolveSchedule,
} from "../lib/timetable-core.js";

const entries = [
  {
    id: 1,
    day_of_week: 1,
    start_time: "09:00",
    end_time: "10:00",
    course_code: "BME 403",
    course_title: "Biomedical Engineering Design",
    venue: "ELH",
    active: true,
  },
  {
    id: 2,
    day_of_week: 2,
    start_time: "09:00",
    end_time: "11:00",
    course_code: "BME 405",
    course_title: "Bioinformatics",
    venue: "BME LR2",
    active: true,
  },
];

function resolve(date, changes = [], settings = {}) {
  return resolveSchedule({ date, entries, changes, settings });
}

assert.equal(resolve("2026-10-19").length, 1, "Monday resolves its base class");
assert.equal(resolve("2026-10-20").length, 1, "Tuesday resolves its base block");
assert.equal(resolve("2026-10-24").length, 0, "Saturday is empty");
assert.equal(resolve("2026-10-25").length, 0, "Sunday is empty");
assert.equal(
  resolve("2026-10-19", [], { skip_dates: ["2026-10-19"] }).length,
  0,
  "Skip dates suppress the complete schedule",
);

const cancelled = resolve("2026-10-19", [
  {
    id: 10,
    change_date: "2026-10-19",
    entry_id: 1,
    change_type: "cancelled",
    note: "Lecturer unavailable",
  },
]);
assert.equal(cancelled[0].status, "cancelled");
assert.match(
  formatDailySchedule("morning", "2026-10-19", cancelled),
  /CANCELLED/,
  "Daily messages keep cancellations visible",
);
assert.equal(formatUpcomingClass(cancelled[0], 10), "");

const venueChanged = resolve("2026-10-19", [
  {
    id: 11,
    change_date: "2026-10-19",
    entry_id: 1,
    change_type: "venue_changed",
    new_venue: "BME LR1",
  },
]);
assert.equal(venueChanged[0].venue, "BME LR1");
assert.equal(venueChanged[0].changed, true);

const movedChanges = [
  {
    id: 12,
    change_date: "2026-10-19",
    moved_to_date: "2026-10-20",
    entry_id: 1,
    change_type: "moved",
    new_start_time: "14:00",
    new_end_time: "15:00",
    new_venue: "NGH",
  },
];
assert.equal(resolve("2026-10-19", movedChanges)[0].status, "moved_out");
const movedIn = resolve("2026-10-20", movedChanges);
assert.equal(movedIn.length, 2);
assert.equal(movedIn[1].course_code, "BME 403");
assert.equal(movedIn[1].start_time, "14:00");

const added = resolve("2026-10-19", [
  {
    id: 13,
    change_date: "2026-10-19",
    entry_id: null,
    change_type: "added",
    new_start_time: "11:00",
    new_end_time: "12:00",
    new_venue: "BME Lab",
    course_code: "BME 499",
    course_title: "Special Seminar",
  },
]);
assert.equal(added.length, 2);
assert.equal(added[1].status, "added");

const upcoming = formatUpcomingClass(entries[0], 10);
assert.match(upcoming, /Class Starting Soon/);
assert.match(upcoming, /in 10 minutes/);
assert.ok(!upcoming.includes("Class Now"));

assert.equal(isDue(530, 530, 10), true);
assert.equal(isDue(540, 530, 10), true);
assert.equal(isDue(541, 530, 10), false);

console.log("Timetable checks passed.");
