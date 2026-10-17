"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../components/icon";
import { daysUntil, formatDate } from "../lib/deadlines";

export default function HomePage() {
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled(
      ["/api/assignments", "/api/announcements"].map(async (url) => {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("Request failed");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Unexpected response");
        return data;
      }),
    );
    if (results[0].status === "fulfilled") setAssignments(results[0].value);
    if (results[1].status === "fulfilled") setAnnouncements(results[1].value);
    if (results.some((result) => result.status === "rejected")) {
      setError("Some class updates could not be loaded. Please try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial network synchronization after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const upcoming = useMemo(
    () =>
      assignments
        .filter((item) => daysUntil(item.deadline_date) >= 0)
        .sort((a, b) => a.deadline_date.localeCompare(b.deadline_date))
        .slice(0, 3),
    [assignments],
  );
  const dueThisWeek = assignments.filter((item) => {
    const days = daysUntil(item.deadline_date);
    return days >= 0 && days <= 7;
  }).length;
  const latestNotice = announcements[0];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BIOVATORS, CONNECTED</p>
          <h1>What matters today<span>.</span></h1>
          <p>A simple view of our next deadlines and latest class update.</p>
        </div>
        <Link className="button primary" href="/assignments">
          View assignments <Icon name="arrow" size={17} />
        </Link>
      </div>

      {error && (
        <div className="notice error" role="alert">
          {error}<button className="text-button" onClick={load}>Try again</button>
        </div>
      )}

      {loading ? (
        <div className="announcement-ticker ticker-skeleton" aria-hidden="true">
          <span className="announcement-ticker-label"><Icon name="bell" size={15} />Latest</span>
          <span className="ticker-loading-line" />
        </div>
      ) : latestNotice ? (
        <Link className="announcement-ticker" href="/announcements" aria-label={`Latest announcement: ${latestNotice.title}`}>
          <span className="announcement-ticker-label"><Icon name="bell" size={15} />Latest</span>
          <span className="announcement-ticker-text">
            <strong>{latestNotice.title}</strong>
            <span>{latestNotice.body}</span>
          </span>
          <Icon name="arrow" size={16} />
        </Link>
      ) : null}

      <section className="welcome-panel">
        <div>
          <span className="hero-tag"><span />OUR CLASS COMPANION</span>
          <h2>One clear place for what comes next.</h2>
          <p>Check the next deadline, catch up on an announcement, or make sure your reminder details are correct.</p>
        </div>
        <div className="welcome-actions">
          <Link href="/assignments"><Icon name="book" />Assignments</Link>
          <Link href="/announcements"><Icon name="bell" />Noticeboard</Link>
          <Link href="/reminders"><Icon name="clock" />My reminders</Link>
        </div>
      </section>

      <section className="stats" aria-label="Class overview">
        <div className="stat-card">
          <div><span className="stat-icon orange"><Icon name="clock" /></span>{loading ? <span className="stat-value-skeleton" aria-hidden="true" /> : <span className="stat-value">{dueThisWeek}</span>}</div>
          <h3>Due this week</h3><p>Deadlines that need our attention.</p>
        </div>
        <div className="stat-card">
          <div><span className="stat-icon green"><Icon name="book" /></span>{loading ? <span className="stat-value-skeleton" aria-hidden="true" /> : <span className="stat-value">{assignments.length}</span>}</div>
          <h3>All assignments</h3><p>Everything currently on our list.</p>
        </div>
        <div className="stat-card">
          <div><span className="stat-icon purple"><Icon name="bell" /></span>{loading ? <span className="stat-value-skeleton" aria-hidden="true" /> : <span className="stat-value">{announcements.length}</span>}</div>
          <h3>Class notices</h3><p>Updates shared with Biovators.</p>
        </div>
      </section>

      <div className="home-focus-grid">
        <section className="panel">
          <div className="section-heading">
            <div><p className="eyebrow">COMING UP</p><h2>Next assignments</h2></div>
            <Link className="text-link" href="/assignments">See all <Icon name="arrow" size={15} /></Link>
          </div>
          {loading ? (
            <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div>
          ) : upcoming.length ? (
            <div className="simple-list">
              {upcoming.map((item) => (
                <Link href={`/assignments#assignment-${item.id}`} key={item.id}>
                  <span className="list-icon"><Icon name="book" size={18} /></span>
                  <span><small>{item.course_title}</small><strong>{item.assignment_title}</strong><em>{formatDate(item.deadline_date)}</em></span>
                  <Icon name="arrow" size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="compact-empty"><strong>No upcoming assignment</strong><p>Enjoy the breathing room.</p></div>
          )}
        </section>

        <section className="panel latest-notice">
          <div className="section-heading">
            <div><p className="eyebrow">LATEST UPDATE</p><h2>Noticeboard</h2></div>
            <span className="stat-icon purple"><Icon name="bell" size={17} /></span>
          </div>
          {loading ? <div className="skeleton" /> : latestNotice ? (
            <article>
              <span className="announcement-date">{formatDate(latestNotice.created_at)}</span>
              <h3>{latestNotice.title}</h3><p>{latestNotice.body}</p>
              <span className="posted-by">{latestNotice.posted_by}</span>
            </article>
          ) : (
            <div className="compact-empty"><strong>You’re all caught up</strong><p>New class notices will appear here.</p></div>
          )}
          <Link className="panel-action" href="/announcements">Open noticeboard <Icon name="arrow" size={16} /></Link>
        </section>
      </div>
    </>
  );
}
