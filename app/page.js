"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../components/icon";
import { daysUntil, formatDate } from "../lib/deadlines";

function countdown(date) {
  const days = daysUntil(date);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export default function HomePage() {
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [welcome, setWelcome] = useState({ greeting: "Hello, Biovator 👋", date: "" });

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
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    // The greeting deliberately follows the student's device time.
    setWelcome({
      greeting: `${greeting}, Biovator 👋`,
      date: now.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" }),
    });
  }, [load]);

  const upcoming = useMemo(
    () => assignments
      .filter((item) => daysUntil(item.deadline_date) >= 0)
      .sort((a, b) => a.deadline_date.localeCompare(b.deadline_date))
      .slice(0, 5),
    [assignments],
  );
  const nextAssignment = upcoming[0];
  const dueThisWeek = assignments.filter((item) => {
    const days = daysUntil(item.deadline_date);
    return days >= 0 && days <= 7;
  }).length;
  const latestNotice = announcements[0];

  return (
    <>
      <header className="home-greeting">
        <div><h1>{welcome.greeting}</h1><p>{welcome.date || "Here is what matters today."}</p></div>
        <Link className="home-reminder-link" href="/reminders"><Icon name="bell" size={17} />My reminders</Link>
      </header>

      {error && <div className="notice error" role="alert">{error}<button className="text-button" onClick={load}>Try again</button></div>}

      {loading ? (
        <section className="next-up-card next-up-loading" aria-label="Loading the next assignment">
          <span className="next-up-skeleton wide" /><span className="next-up-skeleton" /><span className="next-up-skeleton short" />
        </section>
      ) : nextAssignment ? (
        <section className="next-up-card">
          <div className="next-up-copy">
            <span className="next-up-label">Next up</span>
            <span className="next-up-course">{nextAssignment.course_title}</span>
            <h2>{nextAssignment.assignment_title}</h2>
            <strong className="next-up-countdown"><Icon name="clock" size={18} />{countdown(nextAssignment.deadline_date)}</strong>
            <p>{formatDate(nextAssignment.deadline_date)} · {nextAssignment.submission_method}</p>
          </div>
          <Link className="button next-up-action" href={`/assignments#assignment-${nextAssignment.id}`}>How to submit <Icon name="arrow" size={16} /></Link>
        </section>
      ) : (
        <section className="next-up-card next-up-empty">
          <span className="empty-icon"><Icon name="check" /></span>
          <div><span className="next-up-label">Next up</span><h2>You’re all caught up 🎉</h2><p>Nothing is due right now. You can use the time to review a course.</p></div>
          <Link className="button next-up-action" href="/materials">Browse materials <Icon name="arrow" size={16} /></Link>
        </section>
      )}

      <nav className="home-stat-chips" aria-label="Quick class overview">
        {loading ? <><span className="home-chip-skeleton" /><span className="home-chip-skeleton" /><span className="home-chip-skeleton" /></> : <>
          <Link href="/assignments?filter=This%20week"><Icon name="clock" size={15} />Due this week <strong>{dueThisWeek}</strong></Link>
          <Link href="/assignments"><Icon name="book" size={15} />All assignments <strong>{assignments.length}</strong></Link>
          <Link href="/announcements"><Icon name="bell" size={15} />Class notices <strong>{announcements.length}</strong></Link>
        </>}
      </nav>

      <section className="home-section upcoming-section">
        <div className="home-section-heading"><div><span>Coming up</span><h2>Upcoming assignments</h2></div><Link href="/assignments">See all <Icon name="arrow" size={15} /></Link></div>
        {loading ? <div className="assignment-strip"><span className="strip-skeleton" /><span className="strip-skeleton" /><span className="strip-skeleton" /></div> : upcoming.length ? (
          <div className="assignment-strip">
            {upcoming.map((item) => <Link href={`/assignments#assignment-${item.id}`} key={item.id} className="assignment-preview-card"><span>{item.course_title}</span><strong>{item.assignment_title}</strong><small>{countdown(item.deadline_date)}</small></Link>)}
          </div>
        ) : <div className="home-inline-empty"><Icon name="check" /><span><strong>No upcoming assignments</strong><small>Enjoy the breathing room.</small></span></div>}
      </section>

      <section className="home-section latest-home-notice">
        <div className="home-section-heading"><div><span>Latest notice</span><h2>Noticeboard</h2></div><Link href="/announcements">Open <Icon name="arrow" size={15} /></Link></div>
        {loading ? <div className="notice-preview-skeleton"><span /><span /><span /></div> : latestNotice ? (
          <Link href="/announcements" className="latest-notice-card">
            <span className="notice-card-icon"><Icon name="bell" /></span>
            <span className="latest-notice-copy"><small>{formatDate(latestNotice.created_at)}{latestNotice.mandatory ? " · Mandatory" : ""}</small><strong>{latestNotice.title}</strong><span>{latestNotice.body}</span></span>
            <Icon name="arrow" size={17} />
          </Link>
        ) : <div className="home-inline-empty"><Icon name="bell" /><span><strong>No new notices</strong><small>Important class updates will appear here.</small></span></div>}
      </section>
    </>
  );
}
