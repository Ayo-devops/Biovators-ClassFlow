"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/icon";
import { formatDate } from "../../lib/deadlines";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/announcements", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error();
      setAnnouncements(data);
    } catch {
      setError("The noticeboard could not be loaded. Please try again.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Initial network synchronization after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">WORD AROUND BIOVATORS</p><h1>Noticeboard<span>.</span></h1><p>Important class updates, arranged with the newest first.</p></div>
    </div>
    {error && <div className="notice error" role="alert">{error}<button className="text-button" onClick={load}>Try again</button></div>}
    <section className="panel focused-page-panel">
      {loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div> : announcements.length ? (
        <div className="noticeboard-list">{announcements.map((item) => <article key={item.id}><div className="notice-marker"><Icon name="bell" size={18} /></div><div><span className="announcement-date">{formatDate(item.created_at)}</span><h2>{item.title}</h2><p>{item.body}</p><span className="posted-by">Shared by {item.posted_by}</span></div></article>)}</div>
      ) : <div className="empty-state"><span className="empty-icon"><Icon name="bell" /></span><h3>You’re all caught up</h3><p>New class notices will appear here.</p></div>}
    </section>
  </>;
}
