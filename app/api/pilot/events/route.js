import { createHmac } from "node:crypto";
import {
  PILOT_EVENT_TYPES,
  PUBLIC_PATHS,
  lagosDate,
  pilotDatabase,
} from "../../../../lib/pilot-server";

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const eventType = String(body.eventType || "");
    const path = String(body.path || "").split("?")[0];
    const deviceId = String(body.deviceId || "");
    if (!PILOT_EVENT_TYPES.has(eventType) || !PUBLIC_PATHS.has(path) || !validUuid(deviceId)) {
      return Response.json({ error: "Invalid pilot event." }, { status: 400 });
    }

    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!secret) throw new Error("Pilot measurement is not configured.");
    const deviceHash = createHmac("sha256", secret).update(deviceId).digest("hex");
    const { error } = await pilotDatabase()
      .from("pilot_events")
      .upsert(
        {
          device_hash: deviceHash,
          event_type: eventType,
          path,
          event_day: lagosDate(),
        },
        { onConflict: "device_hash,event_type,path,event_day", ignoreDuplicates: true },
      );
    if (error) throw error;
    return Response.json({ recorded: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503 });
  }
}
