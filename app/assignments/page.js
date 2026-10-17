"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../../components/icon";
import { daysUntil, deadlineStatus, formatDate } from "../../lib/deadlines";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
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
    // Initial network synchronization after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const courses = [...new Set(assignments.map((item) => item.course_title))];
  const visible = useMemo(() => assignments.filter((item) => {
    const days = daysUntil(item.deadline_date);
    const matchesText = `${item.course_title} ${item.assignment_title}`.toLowerCase().includes(query.toLowerCase());
    const matchesCourse = course === "All courses" || item.course_title === course;
    const matchesFilter = filter === "All" || (filter === "Due soon" && days >= 0 && days <= 2) || (filter === "This week" && days >= 0 && days <= 7) || (filter === "Overdue" && days < 0);
    return matchesText && matchesCourse && matchesFilter;
  }).sort((a, b) => a.deadline_date.localeCompare(b.deadline_date)), [assignments, course, filter, query]);

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">OUR WORK, IN ONE PLACE</p><h1>Assignments<span>.</span></h1><p>Find a task, check its deadline, and see exactly how to submit it.</p></div>
      </div>
      {error && <div className="notice error" role="alert">{error}<button className="text-button" onClick={load}>Try again</button></div>}
      <section className="panel focused-page-panel">
        <div className="filters page-filters">
          <label className="search"><Icon name="search" /><input aria-label="Search assignments" placeholder="Search by course or assignment…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select aria-label="Filter by course" value={course} onChange={(event) => setCourse(event.target.value)}><option>All courses</option>{courses.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div className="filter-tabs" role="group" aria-label="Filter assignments">
          {["All", "Due soon", "This week", "Overdue"].map((item) => <button key={item} className={filter === item ? "selected" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        {loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : visible.length ? (
          <div className="assignment-list">
            {visible.map((item) => {
              const status = deadlineStatus(item.deadline_date);
              return <details className="assignment" id={`assignment-${item.id}`} key={item.id}>
                <summary><span className="course-icon"><Icon name="book" /></span><span className="assignment-title"><span className="course-name">{item.course_title}</span><strong>{item.assignment_title}</strong><span className="assignment-meta"><Icon name="calendar" size={13} />{formatDate(item.deadline_date)}<span>·</span>{item.submission_method}</span></span><span className={`badge ${status.tone}`}>{status.label}</span><span className="expand-mark">+</span></summary>
                <div className="assignment-details"><p>{item.description || "No additional instructions were added."}</p><div><span><b>Lecturer</b> {item.lecturer_name || "Not specified"}</span><span><b>Priority</b> {item.priority || "Medium"}</span><span><b>Submit via</b> {item.submission_method}</span></div>{item.files?.length > 0 && <div className="assignment-files"><b>Attached files</b>{item.files.map((file) => <a key={file.id} href={file.download_url} target="_blank" rel="noreferrer"><Icon name="download" size={15} />{file.file_name}</a>)}</div>}</div>
              </details>;
            })}
          </div>
        ) : <div className="empty-state"><span className="empty-icon"><Icon name="book" /></span><h3>No matching assignments</h3><p>Try another search or change a filter.</p></div>}
        <div className="panel-foot">{loading ? "Loading assignments…" : `${visible.length} assignment${visible.length === 1 ? "" : "s"}`}<span>Open any assignment for full details.</span></div>
      </section>
    </>
  );
}
