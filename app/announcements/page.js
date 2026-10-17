"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "../../components/icon";
import { formatDate } from "../../lib/deadlines";

const LAST_SEEN_KEY = "classflow.noticeboardLastSeen";

function relativeTime(date) {
  const value = new Date(date).getTime();
  if (!Number.isFinite(value)) return "";
  const days = Math.max(0, Math.floor((Date.now() - value) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSeen, setLastSeen] = useState(0);
  const [expanded, setExpanded] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/announcements", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error();
      setAnnouncements([...data].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.created_at) - new Date(a.created_at)));
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    } catch {
      setError("The noticeboard could not be loaded. Please try again.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const seen = new Date(localStorage.getItem(LAST_SEEN_KEY) || 0).getTime();
    // Preserve the previous visit while this page marks the current visit as seen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSeen(Number.isFinite(seen) ? seen : 0);
    load();
  }, [load]);

  function toggleExpanded(id) {
    const key = String(id);
    setExpanded((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  return <>
    <div className="page-heading">
      <div><h1>Noticeboard<span>.</span></h1><p>The latest updates from our class.</p></div>
    </div>
    {error && <div className="notice error" role="alert">{error}<button className="text-button" onClick={load}>Try again</button></div>}
    <section className="panel focused-page-panel">
      {loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div> : announcements.length ? (
        <div className="noticeboard-list">{announcements.map((item) => {
          const unread = new Date(item.created_at).getTime() > lastSeen;
          const isExpanded = expanded.includes(String(item.id));
          const longNotice = String(item.body || "").length > 220;
          return <article className={`${item.pinned ? "pinned-notice" : ""} ${item.mandatory ? "mandatory-notice" : ""}`} key={item.id}>
            <div className="notice-marker"><Icon name={item.pinned ? "shield" : "bell"} size={18} />{unread && <span className="unread-dot" aria-label="Unread notice" />}</div>
            <div className="notice-content">
              <div className="notice-meta"><span>{relativeTime(item.created_at)} · {formatDate(item.created_at)}</span><span className="notice-flags">{item.pinned && <em>Pinned</em>}{item.mandatory && <em>Mandatory</em>}</span></div>
              <h2>{item.title}</h2>
              <p className={!isExpanded && longNotice ? "notice-collapsed" : ""}>{item.body}</p>
              {longNotice && <button className="read-more-button" type="button" onClick={() => toggleExpanded(item.id)}>{isExpanded ? "Show less" : "Read more"}</button>}
              <span className="posted-by">Shared by {item.posted_by}</span>
            </div>
          </article>;
        })}</div>
      ) : <div className="empty-state"><span className="empty-icon"><Icon name="bell" /></span><h3>You’re all caught up</h3><p>There are no new class notices.</p><Link className="empty-action" href="/assignments">Check assignments <Icon name="arrow" size={15} /></Link></div>}
    </section>
  </>;
}
