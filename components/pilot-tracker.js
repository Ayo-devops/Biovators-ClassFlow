"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPilotEvent } from "../lib/pilot-events";

export default function PilotTracker({ enabled }) {
  const path = usePathname();

  useEffect(() => {
    if (enabled) trackPilotEvent("page_view", path);
  }, [enabled, path]);

  return null;
}
