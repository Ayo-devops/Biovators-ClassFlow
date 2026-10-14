import { authorizeAdmin } from "../../../../lib/admin-auth";
import {
  addDays,
  formatDailySchedule,
  formatUpcomingClass,
  isDue,
  lagosNowParts,
  resolveSchedule,
  timeToMinutes,
} from "../../../../lib/timetable-core";
import {
  loadTimetableData,
  timetableSupabase,
  timetableUnavailable,
} from "../../../../lib/timetable-server";
import {
  listWhatsAppGroups,
  sendWhatsAppGroup,
} from "../../../../lib/whatsapp-server";

function candidate(kind, date, slotKey, message) {
  return { kind, date, slotKey, message };
}

async function dispatchCandidates(nowDate = new Date()) {
  const now = lagosNowParts(nowDate);
  const tomorrow = addDays(now.date, 1);
  const data = await loadTimetableData(now.date, tomorrow);
  const todaySchedule = resolveSchedule({ date: now.date, ...data });
  const tomorrowSchedule = resolveSchedule({ date: tomorrow, ...data });
  const { settings } = data;
  const due = [];

  if (!settings.auto_send_enabled) {
    return { now, settings, due, paused: true };
  }

  if (
    settings.morning_enabled &&
    todaySchedule.length &&
    isDue(
      now.minutes,
      timeToMinutes(settings.morning_time),
      settings.grace_minutes,
    )
  ) {
    due.push(
      candidate(
        "morning",
        now.date,
        "daily",
        formatDailySchedule("morning", now.date, todaySchedule),
      ),
    );
  }

  if (
    settings.evening_enabled &&
    tomorrowSchedule.length &&
    isDue(
      now.minutes,
      timeToMinutes(settings.evening_time),
      settings.grace_minutes,
    )
  ) {
    due.push(
      candidate(
        "evening",
        tomorrow,
        "daily",
        formatDailySchedule("evening", tomorrow, tomorrowSchedule),
      ),
    );
  }

  if (settings.class_now_enabled) {
    for (const item of todaySchedule) {
      if (["cancelled", "moved_out"].includes(item.status)) continue;
      const alertMinute =
        timeToMinutes(item.start_time) - settings.class_now_lead_minutes;
      if (isDue(now.minutes, alertMinute, settings.grace_minutes)) {
        due.push(
          candidate(
            "class_now",
            now.date,
            `${item.id}:${item.start_time.slice(0, 5)}`,
            formatUpcomingClass(item, settings.class_now_lead_minutes),
          ),
        );
      }
    }
  }

  return { now, settings, due, paused: false };
}

async function alreadySent(candidateItem) {
  const { data, error } = await timetableSupabase
    .from("timetable_send_log")
    .select("status")
    .eq("kind", candidateItem.kind)
    .eq("for_date", candidateItem.date)
    .eq("slot_key", candidateItem.slotKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.status || null;
}

async function previewDispatch() {
  const result = await dispatchCandidates();
  const due = [];
  for (const item of result.due) {
    due.push({ ...item, existingStatus: await alreadySent(item) });
  }
  return { ...result, due, dryRun: true };
}

async function claim(item) {
  const { data, error } = await timetableSupabase
    .from("timetable_send_log")
    .insert({
      kind: item.kind,
      for_date: item.date,
      slot_key: item.slotKey,
      status: "pending",
      message_text: item.message,
    })
    .select()
    .single();
  if (error?.code === "23505") return null;
  if (error) throw new Error(error.message);
  return data;
}

async function updateLog(id, values) {
  const { error } = await timetableSupabase
    .from("timetable_send_log")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function GET(request) {
  const authorization = await authorizeAdmin(request, {
    allowReminderKey: true,
  });
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  try {
    return Response.json(await previewDispatch());
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authorization = await authorizeAdmin(request, {
    allowReminderKey: true,
  });
  if (authorization.error) return authorization.error;
  if (!timetableSupabase) return timetableUnavailable();

  try {
    const body = await request.json();
    if (body.confirm !== true) {
      return Response.json(
        { error: "Confirmed dispatch is required." },
        { status: 400 },
      );
    }

    const result = await dispatchCandidates();
    if (result.paused || !result.due.length) {
      return Response.json({
        success: true,
        paused: result.paused,
        sent: 0,
        skipped: result.due.length,
      });
    }
    if (!result.settings.target_group_id) {
      return Response.json(
        { error: "A timetable WhatsApp group has not been selected." },
        { status: 409 },
      );
    }

    const { groups = [] } = await listWhatsAppGroups();
    const group = groups.find(
      (item) => item.id === result.settings.target_group_id,
    );
    if (!group) {
      return Response.json(
        { error: "The selected timetable group is no longer available." },
        { status: 409 },
      );
    }

    const outcomes = [];
    for (const item of result.due) {
      if (!item.message) continue;
      const log = await claim(item);
      if (!log) {
        outcomes.push({ ...item, status: "duplicate_skipped" });
        continue;
      }
      try {
        await sendWhatsAppGroup(group.id, item.message);
        await updateLog(log.id, {
          status: "sent",
          sent_at: new Date().toISOString(),
          error: null,
        });
        outcomes.push({ ...item, status: "sent" });
      } catch (sendError) {
        await updateLog(log.id, {
          status: "failed",
          error: sendError.message,
        });
        outcomes.push({ ...item, status: "failed", error: sendError.message });
      }
    }

    return Response.json({
      success: outcomes.every((item) => item.status !== "failed"),
      group: group.name,
      sent: outcomes.filter((item) => item.status === "sent").length,
      outcomes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
