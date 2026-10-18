import { BrevoClient } from "@getbrevo/brevo";
import { createClient } from "@supabase/supabase-js";
import { authorizeAdmin } from "../../../../lib/admin-auth";

const EVENT_TYPES = new Set([
  "worker_started",
  "whatsapp_connected",
  "whatsapp_disconnected",
  "whatsapp_auth_failure",
  "ai_repeated_failures",
  "ai_recovered",
  "timetable_repeated_failures",
  "timetable_recovered",
]);
const SEVERITIES = new Set(["info", "warning", "critical"]);
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

function database() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error("Operations storage is not configured.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function alertEmails() {
  return (process.env.CLASSFLOW_ALERT_EMAILS || process.env.CLASSFLOW_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email, index, all) => email && all.indexOf(email) === index);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendAlert(event) {
  const recipients = alertEmails();
  if (!recipients.length || !process.env.BREVO_API_KEY) return false;
  const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  await brevo.transactionalEmails.sendTransacEmail({
    sender: { name: "ClassFlow Operations", email: "akoredeayomide099@gmail.com" },
    to: recipients.map((email) => ({ email })),
    subject: `[ClassFlow ${event.severity.toUpperCase()}] ${event.message}`,
    htmlContent:
      `<p><strong>ClassFlow needs attention.</strong></p>` +
      `<p>${escapeHtml(event.message)}</p>` +
      `<p><b>Area:</b> ${escapeHtml(event.event_type.replaceAll("_", " "))}<br>` +
      `<b>Time:</b> ${escapeHtml(new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos", timeZoneName: "short" }))}</p>` +
      `<p>Open <a href="https://biovators-class-flow.vercel.app/admin/help">Admin → Help and tutorials</a> to check the current service status.</p>` +
      `<p>— ClassFlow for Biovators</p>`,
  });
  return true;
}

export async function GET(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  try {
    const { data, error } = await database()
      .from("operational_events")
      .select("id,event_type,severity,message,source,alert_sent,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return Response.json(data || []);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503 });
  }
}

export async function POST(request) {
  const authorization = await authorizeAdmin(request, {
    allowWorkerKey: true,
    allowReminderKey: true,
  });
  if (authorization.error) return authorization.error;

  try {
    const body = await request.json();
    const event = {
      event_type: String(body.eventType || ""),
      severity: String(body.severity || ""),
      message: String(body.message || "").trim().slice(0, 500),
      source: "whatsapp_worker",
      dedupe_key: String(body.dedupeKey || body.eventType || "").slice(0, 120),
      details: body.details && typeof body.details === "object" && !Array.isArray(body.details)
        ? body.details
        : {},
    };
    if (!EVENT_TYPES.has(event.event_type) || !SEVERITIES.has(event.severity) || !event.message) {
      return Response.json({ error: "Invalid operational event." }, { status: 400 });
    }

    const supabase = database();
    let shouldAlert = event.severity !== "info";
    if (shouldAlert && event.dedupe_key) {
      const cutoff = new Date(Date.now() - ALERT_COOLDOWN_MS).toISOString();
      const { data: recent, error: recentError } = await supabase
        .from("operational_events")
        .select("id")
        .eq("dedupe_key", event.dedupe_key)
        .eq("alert_sent", true)
        .gte("created_at", cutoff)
        .limit(1);
      if (recentError) throw recentError;
      shouldAlert = !recent?.length;
    }

    const { data: recorded, error: insertError } = await supabase
      .from("operational_events")
      .insert({ ...event, alert_sent: false })
      .select("id")
      .single();
    if (insertError) throw insertError;

    let alerted = false;
    if (shouldAlert) {
      try {
        alerted = await sendAlert(event);
      } catch (alertError) {
        console.error("Operations alert email failed:", alertError.message);
      }
      if (alerted) {
        await supabase
          .from("operational_events")
          .update({ alert_sent: true })
          .eq("id", recorded.id);
      }
    }

    return Response.json({ recorded: true, alerted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503 });
  }
}
