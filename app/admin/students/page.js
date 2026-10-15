"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../../../components/icon";
import WorkspaceHeading from "../../../components/workspace-heading";
import { useWorkspaceSession } from "../../../lib/use-workspace-session";

export default function AdminStudentsPage() {
  const workspace = useWorkspaceSession();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    if (!workspace.accessToken || !workspace.isAdmin) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/students", { headers: { Authorization: `Bearer ${workspace.accessToken}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Students could not be loaded.");
      setStudents(data);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [workspace.accessToken, workspace.isAdmin]);

  useEffect(() => {
    // Load protected student data after workspace authorization resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function reminderAction(student, send) {
    if (send && !window.confirm(`Send current deadline reminders only to ${student.student_name}?`)) return;
    const action = send ? "send" : "preview";
    setBusy(`${student.id}:${action}`); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/send-reminders${send ? "" : `?studentId=${encodeURIComponent(student.id)}`}`, {
        method: send ? "POST" : "GET",
        headers: { Authorization: `Bearer ${workspace.accessToken}`, ...(send ? { "Content-Type": "application/json" } : {}) },
        body: send ? JSON.stringify({ studentId: student.id }) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The reminder request failed.");
      setNotice(send ? `Finished for ${student.student_name}: ${data.results.emails} email and ${data.results.whatsapp} WhatsApp reminder(s) sent${data.results.failures.length ? `; ${data.results.failures.length} failed.` : "."}` : `${student.student_name} would receive ${data.deliveries} reminder(s) across ${data.assignments} assignment(s). Nothing was sent.`);
    } catch (actionError) { setError(actionError.message); }
    finally { setBusy(""); }
  }

  async function remove(student) {
    if (!window.confirm(`Remove ${student.student_name} from the reminder list?`)) return;
    setBusy(`${student.id}:delete`); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/students/${student.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${workspace.accessToken}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The student could not be removed.");
      setStudents((current) => current.filter((item) => item.id !== student.id));
      setNotice(`${student.student_name} was removed from the reminder list.`);
    } catch (removeError) { setError(removeError.message); }
    finally { setBusy(""); }
  }

  const visible = useMemo(() => students.filter((student) => `${student.student_name} ${student.student_email} ${student.phone_number || ""}`.toLowerCase().includes(query.toLowerCase())), [students, query]);

  return <>
    <WorkspaceHeading eyebrow="ADMIN · STUDENTS" title="Students and reminders" description="Find a registration, preview one student’s reminders, or remove access safely." user={workspace.user} role={workspace.role} onSignOut={workspace.signOut} />
    {!workspace.loading && !workspace.isAdmin && <div className="notice error" role="alert">Only administrators can view student registrations.</div>}
    {(workspace.error || error) && <div className="notice error" role="alert">{workspace.error || error}<button className="text-button" onClick={workspace.error ? workspace.retry : load}>Try again</button></div>}
    {notice && <div className="notice success" role="status">{notice}</div>}
    {workspace.isAdmin && <section className="panel focused-page-panel">
      <label className="search wide-search"><Icon name="search" /><input aria-label="Search registered students" placeholder="Search by name, email or phone…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      {workspace.loading || loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div> : visible.length ? <div className="student-list">{visible.map((student) => <article key={student.id}><span className="avatar student-avatar">{student.student_name?.slice(0, 2).toUpperCase()}</span><div><h3>{student.student_name}</h3><p>{student.student_email}</p><small>{student.phone_number || "No WhatsApp number"}</small></div><div className="row-actions"><button className="button secondary" disabled={Boolean(busy)} onClick={() => reminderAction(student, false)}>Preview</button><button className="button secondary" disabled={Boolean(busy)} onClick={() => reminderAction(student, true)}>Send one test</button><button className="button danger" disabled={Boolean(busy)} onClick={() => remove(student)}>Remove</button></div></article>)}</div> : <div className="empty-state"><h3>No matching students</h3><p>Try a different search.</p></div>}
    </section>}
  </>;
}
