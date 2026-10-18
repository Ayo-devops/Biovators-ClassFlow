"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../../../components/icon";
import WorkspaceHeading from "../../../components/workspace-heading";
import { useWorkspaceSession } from "../../../lib/use-workspace-session";

const REP_GUIDES = [
  {
    title: "Add an assignment",
    text: "Enter the course, task, deadline and submission instructions. Attach files when needed.",
    href: "/submit",
    icon: "book",
    steps: ["Check the course and deadline.", "Explain exactly how students should submit.", "Review the details before publishing."],
  },
  {
    title: "Post a class announcement",
    text: "Share a notice and mark genuinely urgent items as Mandatory or Pinned.",
    href: "/announce",
    icon: "bell",
    steps: ["Use a short, clear title.", "Put the important instruction first.", "Choose the WhatsApp group carefully before sending."],
  },
  {
    title: "Send a WhatsApp group message",
    text: "Choose a group, write the message, then use the final review screen before it leaves ClassFlow.",
    href: "/admin/whatsapp",
    icon: "send",
    steps: ["Confirm the group name.", "Read the message once more.", "Only press Confirm and send when both are correct."],
  },
  {
    title: "Change one class",
    text: "Move, cancel or add a class for one date without changing the normal weekly schedule.",
    href: "/admin/timetable/changes",
    icon: "calendar",
    steps: ["Choose the affected date.", "Describe only the change for that day.", "Preview any correction message before sending."],
  },
];

const ADMIN_GUIDES = [
  {
    title: "Upload study material",
    text: "Add notes and slides under the correct course so students—and the class assistant—can find them.",
    href: "/admin/materials",
    icon: "upload",
    steps: ["Use the official course code and title.", "Give the material a descriptive name.", "Confirm the file opens after uploading."],
  },
  {
    title: "Test one student delivery",
    text: "Send a private test to one selected student before relying on a class-wide reminder.",
    href: "/admin/test-delivery",
    icon: "send",
    steps: ["Choose the intended test student.", "Preview the email and WhatsApp copy.", "Confirm both channels arrived."],
  },
  {
    title: "Manage the weekly timetable",
    text: "Edit the normal class schedule, delivery times and permanent WhatsApp destination.",
    href: "/admin/timetable",
    icon: "clock",
    steps: ["Edit only the day or setting that changed.", "Use Preview before saving.", "Check the permanent group before enabling automation."],
  },
  {
    title: "Review students and reminders",
    text: "Find registrations and check who is ready for email or WhatsApp reminders.",
    href: "/admin/students",
    icon: "users",
    steps: ["Search by the student's details.", "Use private testing for delivery checks.", "Remove a record only when the person requests it."],
  },
];

function GuideCard({ guide }) {
  return (
    <article className="tutorial-card">
      <span className="task-icon"><Icon name={guide.icon} /></span>
      <div className="tutorial-copy">
        <h3>{guide.title}</h3>
        <p>{guide.text}</p>
        <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <Link className="tutorial-link" href={guide.href}>Open this task <Icon name="arrow" size={15} /></Link>
      </div>
    </article>
  );
}

export default function AdminHelpPage() {
  const workspace = useWorkspaceSession();
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [events, setEvents] = useState([]);

  const loadHealth = useCallback(async () => {
    if (!workspace.accessToken) return;
    setHealthLoading(true);
    try {
      const response = await fetch("/api/whatsapp/status", {
        headers: { Authorization: `Bearer ${workspace.accessToken}` },
        cache: "no-store",
      });
      const data = await response.json();
      setHealth({ ...data, reachable: response.ok });
      if (workspace.isAdmin) {
        const eventResponse = await fetch("/api/operations/events", {
          headers: { Authorization: `Bearer ${workspace.accessToken}` },
          cache: "no-store",
        });
        const eventData = await eventResponse.json();
        if (eventResponse.ok && Array.isArray(eventData)) setEvents(eventData);
      }
    } catch {
      setHealth({ connected: false, reachable: false });
    } finally {
      setHealthLoading(false);
    }
  }, [workspace.accessToken, workspace.isAdmin]);

  useEffect(() => {
    // Health is loaded only after the signed-in workspace session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHealth();
  }, [loadHealth]);

  const guides = useMemo(() => {
    if (workspace.role === "rep") return REP_GUIDES;
    if (workspace.role === "admin") return [...REP_GUIDES, ...ADMIN_GUIDES];
    return [...REP_GUIDES, ...ADMIN_GUIDES];
  }, [workspace.role]);

  const audience = workspace.role === "rep"
    ? "Course representative guide"
    : workspace.role === "admin"
      ? "Administrator guide"
      : "Guides available to your team";

  return <>
    <WorkspaceHeading eyebrow="HELP AND TUTORIALS" title="How to use ClassFlow" description="Short, practical instructions for the people helping to run our class." user={workspace.user} role={workspace.role} onSignOut={workspace.signOut} />
    {workspace.error && <div className="notice error" role="alert">{workspace.error}</div>}

    {!workspace.loading && workspace.user && <>
      <section className={`system-health ${health?.connected ? "healthy" : "unhealthy"}`} aria-live="polite">
        <span className="health-icon"><Icon name={health?.connected ? "check" : "bell"} /></span>
        <div>
          <span className="eyebrow">SYSTEM CHECK</span>
          <h2>{healthLoading ? "Checking ClassFlow services…" : health?.connected ? "WhatsApp and automation are available" : "WhatsApp needs attention"}</h2>
          {!healthLoading && <p>{health?.connected
            ? `${health.chatbotEnabled ? "AI assistant ready" : "AI assistant off"} · ${health.materialsEnabled ? "Class materials ready" : "Class materials unavailable"} · ${health.timetableEnabled ? "Timetable automation on" : "Timetable automation off"}`
            : "Do not keep retrying a send. Tell an administrator that the WhatsApp worker may be offline."}</p>}
        </div>
        <button className="button secondary" type="button" onClick={loadHealth} disabled={healthLoading}>Check again</button>
      </section>

      {workspace.isAdmin && <section className="workspace-section operations-history">
        <div className="section-heading"><div><p className="eyebrow">RECENT SERVICE EVENTS</p><h2>What ClassFlow has noticed</h2><p>Only operational events are recorded—never student messages or conversation text.</p></div></div>
        {events.length ? <div className="operations-list">{events.slice(0, 8).map((event) => <article key={event.id}>
          <span className={`operations-dot ${event.severity}`} />
          <div><strong>{event.message}</strong><small>{new Date(event.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}{event.alert_sent ? " · Alert emailed" : ""}</small></div>
        </article>)}</div> : <div className="home-inline-empty"><Icon name="check" /><span><strong>No operational problems recorded</strong><small>Warnings and recovery events will appear here.</small></span></div>}
      </section>}

      <section className="workspace-section">
        <div className="section-heading"><div><p className="eyebrow">{audience}</p><h2>Choose what you want to do</h2></div></div>
        <div className="tutorial-grid">{guides.map((guide) => <GuideCard guide={guide} key={guide.href} />)}</div>
      </section>

      <section className="install-tutorial">
        <span className="task-icon"><Icon name="download" /></span>
        <div><p className="eyebrow">USE IT LIKE AN APP</p><h2>Install ClassFlow on your phone</h2><p><strong>Android:</strong> open ClassFlow in Chrome, open the browser menu, then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p><p><strong>iPhone:</strong> open ClassFlow in Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</p><small>After installation, ClassFlow opens from the phone’s home screen like a normal app.</small></div>
        <Link className="button secondary" href="/reminders">Open install option <Icon name="arrow" size={15} /></Link>
      </section>
    </>}
  </>;
}
