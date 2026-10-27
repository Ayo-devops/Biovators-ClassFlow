"use client";

const DEVICE_KEY = "classflow.pilotDevice";

function deviceId() {
  try {
    let value = localStorage.getItem(DEVICE_KEY);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, value);
    }
    return value;
  } catch {
    return "";
  }
}

export function trackPilotEvent(eventType, path = window.location.pathname) {
  const device = deviceId();
  if (!device) return;

  const payload = JSON.stringify({ eventType, path, deviceId: device });
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      "/api/pilot/events",
      new Blob([payload], { type: "application/json" }),
    );
    if (sent) return;
  }

  fetch("/api/pilot/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
