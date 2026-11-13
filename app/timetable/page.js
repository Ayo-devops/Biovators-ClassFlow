"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/icon";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function shortTime(value) {
  return String(value || "").slice(0, 5);
}

export default function TimetablePage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/timetable/public", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data.error || "The timetable could not be loaded.");
      }
      setEntries(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial timetable synchronization after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Weekly timetable<span>.</span></h1>
          <p>See our regular classes for the week at a glance.</p>
        </div>
      </div>

      {error && (
        <div className="notice error" role="alert">
          {error}
          <button className="text-button" onClick={load}>Try again</button>
        </div>
      )}

      <section className="panel focused-page-panel public-timetable-panel">
        <div className="public-timetable-note">
          <Icon name="calendar" size={18} />
          <span>Check the noticeboard for temporary class changes.</span>
        </div>

        {loading ? (
          <p className="timetable-loading" role="status">Loading our timetable…</p>
        ) : (
          <div className="timetable-day-grid">
            {DAYS.map((day, index) => {
              const dayEntries = entries.filter(
                (item) => Number(item.day_of_week) === index + 1,
              );
              return (
                <article className="timetable-day-card" key={day}>
                  <div className="timetable-day-heading">
                    <h2>{day}</h2>
                    <span>{dayEntries.length}</span>
                  </div>
                  {dayEntries.length ? dayEntries.map((item) => (
                    <div className="timetable-class" key={item.id}>
                      <strong>{item.course_code}</strong>
                      <p>{item.course_title}</p>
                      <small>
                        {shortTime(item.start_time)}–{shortTime(item.end_time)}
                        {item.venue ? ` · ${item.venue}` : ""}
                      </small>
                      {item.lecturer && <small>{item.lecturer}</small>}
                    </div>
                  )) : <p className="timetable-day-empty">No class</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
