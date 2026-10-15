"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../../../components/icon";
import WorkspaceHeading from "../../../components/workspace-heading";
import { formatDate } from "../../../lib/deadlines";
import { useWorkspaceSession } from "../../../lib/use-workspace-session";

export default function AdminAnnouncementsPage() {
  const workspace = useWorkspaceSession();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/announcements", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Announcements could not be loaded.");
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
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    setBusy(item.id); setError("");
    try {
      const response = await fetch(`/api/announcements/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${workspace.accessToken}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The announcement could not be deleted.");
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    } catch (removeError) { setError(removeError.message); }
    finally { setBusy(""); }
  }

  const visible = useMemo(() => items.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  return <>
    <WorkspaceHeading eyebrow="ADMIN · ANNOUNCEMENTS" title="Announcements" description="Review what we have shared and create a new class update." user={workspace.user} role={workspace.role} onSignOut={workspace.signOut}>
      <Link className="button primary" href="/announce"><Icon name="plus" size={16} />Post announcement</Link>
    </WorkspaceHeading>
    {(workspace.error || error) && <div className="notice error" role="alert">{workspace.error || error}<button className="text-button" onClick={workspace.error ? workspace.retry : load}>Try again</button></div>}
    <section className="panel focused-page-panel">
      <label className="search wide-search"><Icon name="search" /><input aria-label="Search announcements" placeholder="Search announcements…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      {workspace.loading || loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div> : visible.length ? <div className="management-list">{visible.map((item) => <article key={item.id}><span className="list-icon notice"><Icon name="bell" size={18} /></span><div><small>{formatDate(item.created_at)}</small><h3>{item.title}</h3><p>{item.body}</p></div>{workspace.isAdmin && <button className="button danger" disabled={busy === item.id} onClick={() => remove(item)}>{busy === item.id ? "Deleting…" : "Delete"}</button>}</article>)}</div> : <div className="empty-state"><h3>No matching announcements</h3><p>Try a different search.</p></div>}
    </section>
  </>;
}
