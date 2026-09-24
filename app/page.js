"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "../components/icon";
import InstallApp from "../components/install-app";
import { daysUntil, deadlineStatus, formatDate } from "../lib/deadlines";
export default function Dashboard() {
  const [assignments, setAssignments] = useState([]),
    [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All assignments"),
    [course, setCourse] = useState("All courses");
  const [today, setToday] = useState(null);
  async function load() {
    const results = await Promise.allSettled(
      ["/api/assignments", "/api/announcements"].map(async (url) => {
        const r = await fetch(url);
        if (!r.ok) throw Error();
        const data = await r.json();
        if (!Array.isArray(data)) throw Error();
        return data;
      }),
    );
    if (results[0].status === "fulfilled") setAssignments(results[0].value);
    if (results[1].status === "fulfilled") setAnnouncements(results[1].value);
    if (results.some((r) => r.status === "rejected"))
      setError(
        "Some class updates could not be loaded. Check your connection and try again.",
      );
    setToday(new Date());
    setLoading(false);
  }
  useEffect(() => {
    // Initial network synchronization; updates are applied after the requests settle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const now = today || new Date();
  const urgent = assignments.filter(
    (a) =>
      daysUntil(a.deadline_date, now) >= 0 &&
      daysUntil(a.deadline_date, now) <= 2,
  );
  const week = assignments.filter(
    (a) =>
      daysUntil(a.deadline_date, now) >= 0 &&
      daysUntil(a.deadline_date, now) <= 7,
  );
  const filtered = assignments
    .filter((a) => {
      const d = daysUntil(a.deadline_date, now);
      return (
        `${a.course_title} ${a.assignment_title}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (course === "All courses" || a.course_title === course) &&
        (filter === "All assignments" ||
          (filter === "Due soon" && d >= 0 && d <= 2) ||
          (filter === "This week" && d >= 0 && d <= 7) ||
          (filter === "Overdue" && d < 0))
      );
    })
    .sort((a, b) => a.deadline_date.localeCompare(b.deadline_date));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">LET’S MAKE ROOM FOR LEARNING</p>
          <h1>
            Your day, a little clearer<span>.</span>
          </h1>
          <p>All your deadlines and class updates. One less thing to juggle.</p>
        </div>
        <Link className="button primary" href="/submit">
          <Icon name="plus" size={18} />
          Add assignment
        </Link>
      </div>
      <section className="hero">
        <div>
          <span className="hero-tag">
            <span />
            YOUR CLASSROOM COMPANION
          </span>
          <h2>
            Big plans.
            <br />
            Small, manageable steps.
          </h2>
          <p>
            See what’s coming up, focus on what matters,
            <br className="desktop-only" /> and take the week one assignment at
            a time.
          </p>
          <a href="#assignments" className="hero-link">
            Let’s see what’s next <Icon name="arrow" size={18} />
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit" />
          <div className="orbit orbit-two" />
          <div className="art-star">✳</div>
          <div className="paper">
            <div className="paper-heading">
              <span className="paper-icon">
                <Icon name="book" />
              </span>
              <span>
                A little progress,
                <br />
                <b>every day.</b>
              </span>
            </div>
            {[1, 2, 3].map((i) => (
              <div className="paper-line" key={i}>
                <i>{i < 3 && <Icon name="check" size={12} />}</i>
                <span />
              </div>
            ))}
            <div className="paper-footer">
              YOU’VE GOT THIS <span>↗</span>
            </div>
          </div>
          <div className="floating-label">
            <Icon name="check" size={17} />
            One step ahead
          </div>
        </div>
      </section>
      <section className="stats" aria-label="Class overview">
        {[
          {
            label: "Due in the next 2 days",
            value: urgent.length,
            icon: "clock",
            tone: "orange",
            detail: "A little attention goes a long way",
          },
          {
            label: "Coming up this week",
            value: week.length,
            icon: "calendar",
            tone: "green",
            detail: "Your week, at a glance",
          },
          {
            label: "Class announcements",
            value: announcements.length,
            icon: "bell",
            tone: "purple",
            detail: "Keep up with your classroom",
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div>
              <span className={`stat-icon ${s.tone}`}>
                <Icon name={s.icon} />
              </span>
              <span className="stat-value">
                {loading || error ? "—" : s.value.toString().padStart(2, "0")}
              </span>
            </div>
            <h3>{s.label}</h3>
            <p>{s.detail}</p>
          </div>
        ))}
      </section>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() => {
              setLoading(true);
              setError("");
              load();
            }}
          >
            Try again
          </button>
        </div>
      )}
      <div className="dashboard-grid">
        <section className="panel" id="assignments">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR TO-DO, TOGETHER</p>
              <h2>
                Assignments <span className="count">{assignments.length}</span>
              </h2>
            </div>
            <Icon name="book" />
          </div>
          <div className="filters">
            <label className="search">
              <Icon name="search" size={18} />
              <input
                aria-label="Search assignments"
                placeholder="Search assignments…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter by course"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              <option>All courses</option>
              {[...new Set(assignments.map((a) => a.course_title))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="filter-tabs" role="group" aria-label="Filter by deadline">
            {["All assignments", "Due soon", "This week", "Overdue"].map(
              (f) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  className={filter === f ? "selected" : ""}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ),
            )}
          </div>
          {loading ? (
            <div
              className="skeleton-list"
              aria-label="Loading assignments"
              role="status"
            >
              {[1, 2, 3].map((i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          ) : filtered.length ? (
            <div className="assignment-list">
              {filtered.map((a) => {
                const status = deadlineStatus(a.deadline_date, now);
                return (
                  <details className="assignment" key={a.id}>
                    <summary>
                      <span className="course-icon">
                        <Icon name="book" />
                      </span>
                      <span className="assignment-title">
                        <span className="course-name">{a.course_title}</span>
                        <strong>{a.assignment_title}</strong>
                        <span className="assignment-meta">
                          <Icon name="calendar" size={13} />
                          {formatDate(a.deadline_date)}
                          <span>·</span>
                          {a.submission_method}
                        </span>
                      </span>
                      <span className={`badge ${status.tone}`}>
                        {status.label}
                      </span>
                      <span className="expand-mark">+</span>
                    </summary>
                    <div className="assignment-details">
                      <p>
                        {a.description ||
                          "No additional instructions have been added."}
                      </p>
                      <div>
                        <span>
                          <b>Lecturer</b> {a.lecturer_name || "Not specified"}
                        </span>
                        <span>
                          <b>Priority</b> {a.priority || "Medium"}
                        </span>
                        <span>
                          <b>Submit via</b> {a.submission_method}
                        </span>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">
                <Icon name="book" size={28} />
              </span>
              <h3>
                {query ||
                filter !== "All assignments" ||
                course !== "All courses"
                  ? "No matching assignments"
                  : error
                    ? "Assignments are unavailable"
                    : "A fresh page for your class"}
              </h3>
              <p>
                {query ||
                filter !== "All assignments" ||
                course !== "All courses"
                  ? "Try another search or change your filters."
                  : error
                    ? "Try again when your connection is back."
                    : "When assignments are added, you’ll find every deadline right here."}
              </p>
              {!error &&
                !query &&
                filter === "All assignments" &&
                course === "All courses" && (
                  <Link className="text-link" href="/submit">
                    Add the first assignment <Icon name="arrow" size={16} />
                  </Link>
                )}
            </div>
          )}
          <div className="panel-foot">
            {loading
              ? "Getting your class up to date…"
              : `${filtered.length} assignments`}
            <span>Small steps. Steady progress.</span>
          </div>
        </section>
        <aside className="right-column">
          <section className="panel" id="announcements">
            <div className="section-heading">
              <div>
                <p className="eyebrow">WORD AROUND CLASS</p>
                <h2>Noticeboard</h2>
              </div>
              <span className="stat-icon purple">
                <Icon name="bell" size={18} />
              </span>
            </div>
            {loading ? (
              <div className="skeleton" />
            ) : announcements.length ? (
              <div className="announcements">
                {announcements.map((a) => (
                  <article key={a.id}>
                    <span className="announcement-date">
                      {formatDate(a.created_at)}
                    </span>
                    <h3>{a.title}</h3>
                    <p>{a.body}</p>
                    <span className="posted-by">{a.posted_by}</span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="notice-empty">
                <p>
                  {error
                    ? "Class notices could not be loaded."
                    : "You’re all caught up."}
                </p>
                <span>Class news and important updates will live here.</span>
              </div>
            )}
            <Link className="panel-action" href="/announce">
              Post an announcement <Icon name="arrow" size={16} />
            </Link>
          </section>
          <section className="reminder-card">
            <span className="stat-icon">
              <Icon name="bell" />
            </span>
            <h3>
              A gentle nudge.{' '}
              <br />
              Right when you need it.
            </h3>
            <p>
              Join the reminder list, or keep an existing registration current
              when your WhatsApp number changes.
            </p>
            <div className="reminder-actions">
              <Link className="button primary" href="/register">
                Register for reminders <Icon name="arrow" size={16} />
              </Link>
              <Link className="button secondary" href="/update-phone">
                Update WhatsApp number
              </Link>
            </div>
          </section>
          <div className="mobile-install">
            <InstallApp />
          </div>
        </aside>
      </div>
    </>
  );
}
