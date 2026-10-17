"use client";

import { useEffect, useState } from "react";

export default function ConnectionStatus() {
  const [online, setOnline] = useState(true);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const syncConnection = () => setOnline(navigator.onLine);
    syncConnection();
    window.addEventListener("online", syncConnection);
    window.addEventListener("offline", syncConnection);

    if (!("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("online", syncConnection);
        window.removeEventListener("offline", syncConnection);
      };
    }

    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) setUpdateReady(true);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });

    return () => {
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("offline", syncConnection);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  async function applyUpdate() {
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    if (!registration?.waiting) window.location.reload();
  }

  if (online && !updateReady) return null;

  return (
    <div className={`app-status ${online ? "app-status-update" : "app-status-offline"}`} role="status">
      <span>
        {online
          ? "A newer version of ClassFlow is ready."
          : "You’re offline. Showing saved ClassFlow content where available."}
      </span>
      {updateReady && (
        <button type="button" onClick={applyUpdate}>
          Refresh
        </button>
      )}
    </div>
  );
}
