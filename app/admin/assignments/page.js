"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../../../components/icon";
import WorkspaceHeading from "../../../components/workspace-heading";
import { formatDate } from "../../../lib/deadlines";
import { useWorkspaceSession } from "../../../lib/use-workspace-session";

export default function AdminAssignmentsPage() {
  const workspace = useWorkspaceSession();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/assignments", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Assignments could not be loaded.");
      setItems(data);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Initial workspace data synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function remove(item) {
    if (!window.confirm(`Delete “${item.assignment_title}”? This cannot be undone.`)) return;
    setBusy(item.id); setError("");
    try {
      const response = await fetch(`/api/assignments/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${workspace.accessToken}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The assignment could not be deleted.");
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    } catch (removeError) { setError(removeError.message); }
    finally { setBusy(""); }
  }

  const visible = useMemo(() => items.filter((item) => `${item.course_title} ${item.assignment_title}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  return <>
    <WorkspaceHeading eyebrow="ADMIN · ASSIGNMENTS" title="Assignments" description="Review our current tasks or add the next one." user={workspace.user} role={workspace.role} onSignOut={workspace.signOut}>
      <Link className="button primary" href="/submit"><Icon name="plus" size={16} />Add assignment</Link>
    </WorkspaceHeading>
    {(workspace.error || error) && <div className="notice error" role="alert">{workspace.error || error}<button className="text-button" onClick={workspace.error ? workspace.retry : load}>Try again</button></div>}
    <section className="panel focused-page-panel">
      <label className="search wide-search"><Icon name="search" /><input aria-label="Search assignments" placeholder="Search by course or assignment…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      {workspace.loading || loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div> : visible.length ? <div className="management-list">{visible.map((item) => <article key={item.id}><span className="list-icon"><Icon name="book" size={18} /></span><div><small>{item.course_title}</small><h3>{item.assignment_title}</h3><p>Due {formatDate(item.deadline_date)} · {item.submission_method}</p></div>{workspace.isAdmin && <button className="button danger" disabled={busy === item.id} onClick={() => remove(item)}>{busy === item.id ? "Deleting…" : "Delete"}</button>}</article>)}</div> : <div className="empty-state"><h3>No matching assignments</h3><p>Try a different search.</p></div>}
    </section>
  </>;
}
