"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "../../components/icon";
import WorkspaceHeading from "../../components/workspace-heading";
import { useWorkspaceSession } from "../../lib/use-workspace-session";

export default function AdminHomePage() {
  const workspace = useWorkspaceSession();
  const [counts, setCounts] = useState({ assignments: 0, announcements: 0, students: 0 });
  const [dataLoading, setDataLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    if (!workspace.accessToken) return;
    setDataLoading(true);
    const requests = [fetch("/api/assignments"), fetch("/api/announcements")];
    if (workspace.isAdmin) {
      requests.push(fetch("/api/students", { headers: { Authorization: `Bearer ${workspace.accessToken}` }, cache: "no-store" }));
    }
    const results = await Promise.allSettled(requests.map(async (request) => {
      const response = await request;
      if (!response.ok) throw new Error();
      const data = await response.json();
      return Array.isArray(data) ? data.length : 0;
    }));
    setCounts({ assignments: results[0]?.value || 0, announcements: results[1]?.value || 0, students: results[2]?.value || 0 });
    setDataLoading(false);
  }, [workspace.accessToken, workspace.isAdmin]);

  useEffect(() => {
    // Load workspace counts after the authenticated session is ready.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCounts();
  }, [loadCounts]);

  const primaryActions = [
    { href: "/submit", title: "Add an assignment", text: "Share a new task and deadline with Biovators.", icon: "book" },
    { href: "/admin/materials", title: "Upload study material", text: "Add notes, slides or course files for students.", icon: "download" },
    { href: "/announce", title: "Post an announcement", text: "Publish an update to the noticeboard or WhatsApp.", icon: "bell" },
    { href: "/admin/whatsapp", title: "Message a WhatsApp group", text: "Write, preview and confirm a group message.", icon: "send" },
    { href: "/admin/timetable/changes", title: "Update one class", text: "Move, cancel or add a class without changing the weekly timetable.", icon: "calendar" },
  ];
  const managementActions = [
    { href: "/admin/help", title: "Help and tutorials", text: "Simple guides for administrators and course representatives.", icon: "book" },
    ...(workspace.isAdmin ? [
      { href: "/admin/students", title: "Students and reminders", text: "View registrations and safely test one-student delivery.", icon: "users" },
      { href: "/admin/timetable", title: "Automated timetable", text: "Manage weekly classes, timing and delivery settings.", icon: "clock" },
      { href: "/admin/test-delivery", title: "Test a delivery", text: "Send an assignment to one selected student only.", icon: "send" },
    ] : []),
    ...(workspace.isSuperAdmin ? [{ href: "/admin/team", title: "Team access", text: "Invite teammates, change roles or revoke access.", icon: "shield" }] : []),
  ];

  return <>
    <WorkspaceHeading eyebrow="BIOVATORS ADMIN" title="What do you need to do?" description="Choose one task. ClassFlow will guide you through the rest." user={workspace.user} role={workspace.role} onSignOut={workspace.signOut} />
    {workspace.error && <div className="notice error" role="alert">{workspace.error}<button className="text-button" onClick={workspace.retry}>Try again</button></div>}
    {workspace.loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div> : workspace.user && <>
      <section className="stats compact-stats" aria-label="Workspace summary">
        <Link href="/admin/assignments" className="stat-card"><div><span className="stat-icon green"><Icon name="book" /></span>{dataLoading ? <span className="stat-value-skeleton" aria-hidden="true" /> : <span className="stat-value">{counts.assignments}</span>}</div><h3>Assignments</h3><p>View and manage our tasks.</p></Link>
        <Link href="/admin/announcements" className="stat-card"><div><span className="stat-icon purple"><Icon name="bell" /></span>{dataLoading ? <span className="stat-value-skeleton" aria-hidden="true" /> : <span className="stat-value">{counts.announcements}</span>}</div><h3>Announcements</h3><p>Review our published notices.</p></Link>
        {workspace.isAdmin && <Link href="/admin/students" className="stat-card"><div><span className="stat-icon orange"><Icon name="users" /></span>{dataLoading ? <span className="stat-value-skeleton" aria-hidden="true" /> : <span className="stat-value">{counts.students}</span>}</div><h3>Registered students</h3><p>Manage reminder recipients.</p></Link>}
      </section>

      <section className="workspace-section">
        <div className="section-heading"><div><p className="eyebrow">EVERYDAY ACTIONS</p><h2>Start a task</h2></div></div>
        <div className="task-grid">{primaryActions.map((action) => <Link href={action.href} key={action.href} className="task-card"><span className="task-icon"><Icon name={action.icon} /></span><div><h3>{action.title}</h3><p>{action.text}</p></div><Icon name="arrow" size={17} /></Link>)}</div>
      </section>

      {managementActions.length > 0 && <section className="workspace-section secondary-tools">
        <div className="section-heading"><div><p className="eyebrow">SETTINGS AND ACCESS</p><h2>Manage ClassFlow</h2></div></div>
        <div className="task-grid">{managementActions.map((action) => <Link href={action.href} key={action.href} className="task-card"><span className="task-icon muted"><Icon name={action.icon} /></span><div><h3>{action.title}</h3><p>{action.text}</p></div><Icon name="arrow" size={17} /></Link>)}</div>
      </section>}
    </>}
  </>;
}
