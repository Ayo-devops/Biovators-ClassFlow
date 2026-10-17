"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "../../components/icon";
import InstallApp from "../../components/install-app";

const REGISTRATION_KEY = "classflow.reminderRegistration";

export default function RemindersPage() {
  const [registration, setRegistration] = useState(undefined);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(REGISTRATION_KEY) || "null");
      // Registration status is intentionally remembered on this device only.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRegistration(saved && typeof saved === "object" ? saved : null);
    } catch {
      localStorage.removeItem(REGISTRATION_KEY);
      setRegistration(null);
    }
  }, []);

  return <>
    <div className="page-heading">
      <div><h1>My reminders<span>.</span></h1><p>See whether this device is registered for class updates.</p></div>
    </div>

    {registration === undefined ? (
      <section className="panel reminder-status-card"><div className="skeleton" /></section>
    ) : registration ? (
      <section className="panel reminder-status-card connected">
        <span className="reminder-status-icon"><Icon name="check" size={24} /></span>
        <div className="reminder-status-copy">
          <span className="reminder-status-label">Connected on this device</span>
          <h2>{registration.phoneLast4 ? `WhatsApp connected: +••• ••${registration.phoneLast4}` : "Email reminders connected"}</h2>
          <p>{registration.email ? `Registered with ${registration.email}.` : "Your reminder registration is saved."} ClassFlow centrally manages delivery times.</p>
        </div>
        <Link className="button secondary" href="/update-phone">Update number <Icon name="arrow" size={16} /></Link>
      </section>
    ) : (
      <section className="panel reminder-start-card">
        <span className="reminder-status-icon"><Icon name="bell" size={24} /></span>
        <div>
          <h2>Turn on class reminders</h2>
          <p>Add your name, email and WhatsApp number once. We’ll use them only for Biovators class updates.</p>
        </div>
        <Link className="button primary" href="/register">Register for reminders <Icon name="arrow" size={16} /></Link>
      </section>
    )}

    <section className="reminder-help-card">
      <Icon name="shield" size={19} />
      <div><h2>Already registered elsewhere?</h2><p>This device may not remember registrations completed on another phone or browser.</p></div>
      <Link href="/update-phone">Update my number <Icon name="arrow" size={15} /></Link>
    </section>

    <section className="mobile-install" aria-label="Install ClassFlow on this phone">
      <InstallApp />
    </section>
  </>;
}
