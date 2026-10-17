"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../../components/icon";
import { daysUntil, deadlineStatus, formatDate } from "../../lib/deadlines";

const DONE_KEY = "classflow.doneAssignments";
const FILTERS = ["All", "Due soon", "This week", "Overdue", "Done"];
const GROUP_ORDER = ["Overdue", "Today", "This week", "Later", "Done"];

function countdown(date) {
  const days = daysUntil(date);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function courseHue(value) {
  return [...String(value)].reduce((total, character) => total + character.charCodeAt(0), 0) % 360;
}

function groupName(item, isDone) {
  if (isDone) return "Done";
  const days = daysUntil(item.deadline_date);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days <= 7) return "This week";
  return "Later";
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [doneIds, setDoneIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [course, setCourse] = useState("All courses");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/assignments", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error();
      setAssignments(data);
    } catch {
      setError("Assignments could not be loaded. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial device preferences and network synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    try {
      const saved = JSON.parse(localStorage.getItem(DONE_KEY) || "[]");
      if (Array.isArray(saved)) setDoneIds(saved.map(String));
    } catch {
      localStorage.removeItem(DONE_KEY);
    }
    const requestedFilter = new URLSearchParams(window.location.search).get("filter");
    if (FILTERS.includes(requestedFilter)) setFilter(requestedFilter);
  }, [load]);

  function toggleDone(id) {
    const key = String(id);
    setDoneIds((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      localStorage.setItem(DONE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const courses = [...new Set(assignments.map((item) => item.course_title))];
  const counts = useMemo(() => ({
    All: assignments.length,
    "Due soon": assignments.filter((item) => { const days = daysUntil(item.deadline_date); return days >= 0 && days <= 2 && !doneIds.includes(String(item.id)); }).length,
    "This week": assignments.filter((item) => { const days = daysUntil(item.deadline_date); return days >= 0 && days <= 7 && !doneIds.includes(String(item.id)); }).length,
    Overdue: assignments.filter((item) => daysUntil(item.deadline_date) < 0 && !doneIds.includes(String(item.id))).length,
    Done: assignments.filter((item) => doneIds.includes(String(item.id))).length,
  }), [assignments, doneIds]);

  const visible = useMemo(() => assignments.filter((item) => {
    const days = daysUntil(item.deadline_date);
    const isDone = doneIds.includes(String(item.id));
    const matchesText = `${item.course_title} ${item.assignment_title}`.toLowerCase().includes(query.toLowerCase());
    const matchesCourse = course === "All courses" || item.course_title === course;
    const matchesFilter = filter === "All"
      || (filter === "Due soon" && days >= 0 && days <= 2 && !isDone)
      || (filter === "This week" && days >= 0 && days <= 7 && !isDone)
      || (filter === "Overdue" && days < 0 && !isDone)
      || (filter === "Done" && isDone);
    return matchesText && matchesCourse && matchesFilter;
  }).sort((a, b) => a.deadline_date.localeCompare(b.deadline_date)), [assignments, course, doneIds, filter, query]);

  const groups = GROUP_ORDER.map((name) => ({
    name,
    items: visible.filter((item) => groupName(item, doneIds.includes(String(item.id))) === name),
  })).filter((group) => group.items.length);

  return (
    <>
      <div className="page-heading">
        <div><h1>Assignments<span>.</span></h1><p>See what is due and how to submit it.</p></div>
      </div>
      {error && <div className="notice error" role="alert">{error}<button className="text-button" onClick={load}>Try again</button></div>}
      <section className="panel focused-page-panel assignment-browser">
        <div className="filters page-filters">
          <label className="search"><Icon name="search" /><input aria-label="Search assignments" placeholder="Search by course or assignment…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select aria-label="Filter by course" value={course} onChange={(event) => setCourse(event.target.value)}><option>All courses</option>{courses.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div className="filter-tabs assignment-filter-tabs" id="filters" role="group" aria-label="Filter assignments">
          {FILTERS.map((item) => <button key={item} className={filter === item ? "selected" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}><span>{item}</span><small>{counts[item]}</small></button>)}
        </div>
        {loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : groups.length ? (
          <div className="assignment-groups">
            {groups.map((group) => <section className={`assignment-group ${group.name === "Done" ? "done-group" : ""}`} key={group.name}>
              <div className="assignment-group-heading"><h2>{group.name}</h2><span>{group.items.length}</span></div>
              <div className="assignment-list">
                {group.items.map((item) => {
                  const isDone = doneIds.includes(String(item.id));
                  const status = isDone ? { label: "Done", tone: "green" } : deadlineStatus(item.deadline_date);
                  return <details className={`assignment ${isDone ? "is-done" : ""}`} id={`assignment-${item.id}`} key={item.id}>
                    <summary><span className="course-dot" style={{ "--course-hue": courseHue(item.course_title) }} /><span className="assignment-title"><span className="course-name">{item.course_title}</span><strong>{item.assignment_title}</strong><span className="assignment-countdown">{isDone ? "Completed on this device" : countdown(item.deadline_date)}</span><span className="assignment-meta"><Icon name="calendar" size={13} />{formatDate(item.deadline_date)}<span>·</span>{item.submission_method}</span></span><span className={`badge ${status.tone}`}><Icon name={isDone ? "check" : "clock"} size={12} />{status.label}</span><span className="expand-mark">+</span></summary>
                    <div className="assignment-details"><p>{item.description || "No additional instructions were added."}</p><div><span><b>Lecturer</b> {item.lecturer_name || "Not specified"}</span><span><b>Priority</b> {item.priority || "Medium"}</span><span><b>Submit via</b> {item.submission_method}</span></div>{item.files?.length > 0 && <div className="assignment-files"><b>Attached files</b>{item.files.map((file) => <a key={file.id} href={file.download_url} target="_blank" rel="noreferrer"><Icon name="download" size={15} />{file.file_name}</a>)}</div>}<button type="button" className={`mark-done-button ${isDone ? "completed" : ""}`} onClick={() => toggleDone(item.id)}><Icon name={isDone ? "arrow" : "check"} size={15} />{isDone ? "Mark as not done" : "Mark done"}</button></div>
                  </details>;
                })}
              </div>
            </section>)}
          </div>
        ) : <div className="empty-state"><span className="empty-icon"><Icon name="check" /></span><h3>You’re all caught up 🎉</h3><p>No assignments match this view.</p><Link className="empty-action" href="/materials">Browse study materials <Icon name="arrow" size={15} /></Link></div>}
        <div className="panel-foot">{loading ? "Loading assignments…" : `${visible.length} assignment${visible.length === 1 ? "" : "s"}`}<span>Completed items stay on this device.</span></div>
      </section>
    </>
  );
}
