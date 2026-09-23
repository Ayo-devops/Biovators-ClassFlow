"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import Icon from "../../components/icon";
import { formatDate } from "../../lib/deadlines";
export default function Admin() {
  const router = useRouter();
  const [user, setUser] = useState(null),
    [role, setRole] = useState(null),
    [accessToken, setAccessToken] = useState(""),
    [assignments, setAssignments] = useState([]),
    [students, setStudents] = useState([]),
    [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [tab, setTab] = useState("Overview"),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(null),
    [reminderNotice, setReminderNotice] = useState("");
  const load = useCallback(async () => {
    try {
      if (!supabase) {
        await Promise.resolve();
        throw Error(
          "Sign-in is not configured yet. Please contact your class administrator.",
        );
      }
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!session) {
        router.replace("/admin/login");
        return;
      }
      setUser(session.user);
      setAccessToken(session.access_token);
      const r =
        session.user.app_metadata?.role ||
        session.user.user_metadata?.role ||
        "rep";
      setRole(r);
      const urls = [
        "/api/assignments",
        "/api/announcements",
        ...(r === "admin" ? ["/api/students"] : []),
      ];
      const data = await Promise.all(
        urls.map(async (url) => {
          const response = await fetch(url, {
            headers:
              url === "/api/students"
                ? { Authorization: `Bearer ${session.access_token}` }
                : undefined,
          });
          if (!response.ok)
            throw Error("Could not load workspace data. Please try again.");
          const json = await response.json();
          if (!Array.isArray(json))
            throw Error("Unexpected response. Please try again.");
          return json;
        }),
      );
      setAssignments(data[0]);
      setAnnouncements(data[1]);
      if (data[2]) setStudents(data[2]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [router]);
  useEffect(() => {
    // Synchronize the workspace with the external auth session and API on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  async function remove(type, id) {
    if (
      !window.confirm(
        type === "students"
          ? "Remove this student from the reminder list?"
          : "Delete this assignment?",
      )
    )
      return;
    setBusy(id);
    setError("");
    try {
      const r = await fetch(`/api/${type}/${id}`, {
        method: "DELETE",
        headers:
          type === "students"
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
      });
      if (!r.ok) throw Error("Could not remove this item. Please try again.");
      if (type === "students") setStudents((s) => s.filter((i) => i.id !== id));
      else setAssignments((a) => a.filter((i) => i.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }
  async function remindStudent(student, send = false) {
    if (
      send &&
      !window.confirm(
        `Send current deadline reminders only to ${student.student_name}?`,
      )
    )
      return;

    const action = send ? "send" : "preview";
    setBusy(`${student.id}:${action}`);
    setError("");
    setReminderNotice("");
    try {
      const url = `/api/send-reminders${
        send ? "" : `?studentId=${encodeURIComponent(student.id)}`
      }`;
      const response = await fetch(url, {
        method: send ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(send ? { "Content-Type": "application/json" } : {}),
        },
        body: send ? JSON.stringify({ studentId: student.id }) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Reminder request failed.");

      if (send) {
        setReminderNotice(
          `Finished for ${student.student_name}: ${data.results.emails} email and ${data.results.whatsapp} WhatsApp reminder(s) sent${
            data.results.failures.length
              ? `; ${data.results.failures.length} failed.`
              : "."
          }`,
        );
      } else {
        setReminderNotice(
          `${student.student_name} would receive ${data.deliveries} reminder(s) across ${data.assignments} assignment(s). Nothing was sent.`,
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/admin/login");
  }
  const tabs = [
    "Overview",
    ...(role === "admin" ? ["Students"] : []),
    "Assignments",
    "Announcements",
  ];
  const rows = (
    tab === "Students"
      ? students
      : tab === "Assignments"
        ? assignments
        : announcements
  ).filter((a) =>
    [
      a.student_name,
      a.student_email,
      a.assignment_title,
      a.course_title,
      a.title,
      a.body,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BEHIND EVERY CONNECTED CLASS</p>
          <h1>
            Your admin workspace<span>.</span>
          </h1>
          <p>
            {user
              ? `${user.email} · ${role === "admin" ? "Administrator" : "Course representative"}`
              : "Keep your class organized, together."}
          </p>
        </div>
        {user && (
          <div className="admin-actions">
            {role === "admin" && (
              <Link className="button primary" href="/admin/invite">
                <Icon name="plus" size={16} />
                Invite teammate
              </Link>
            )}
            <button className="button secondary" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
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
      {reminderNotice && (
        <div className="notice success" role="status">
          {reminderNotice}
        </div>
      )}
      {loading ? (
        <div
          role="status"
          aria-label="Loading workspace"
          className="skeleton-list"
        >
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : (
        user && (
          <>
            <div className="stats">
              {[
                {
                  label: role === "admin" ? "Registered students" : "Your role",
                  value: role === "admin" ? students.length : "Rep",
                  icon: "users",
                },
                {
                  label: "Class assignments",
                  value: assignments.length,
                  icon: "book",
                },
                {
                  label: "Announcements",
                  value: announcements.length,
                  icon: "bell",
                },
              ].map((s) => (
                <div className="stat-card" key={s.label}>
                  <div>
                    <span className="stat-icon">
                      <Icon name={s.icon} />
                    </span>
                    <span className="stat-value">{s.value}</span>
                  </div>
                  <h3>{s.label}</h3>
                </div>
              ))}
            </div>
            <section className="panel">
              <div className="filter-tabs">
                {tabs.map((t) => (
                  <button
                    key={t}
                    className={tab === t ? "selected" : ""}
                    aria-pressed={tab === t}
                    onClick={() => {
                      setTab(t);
                      setQuery("");
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {tab === "Overview" ? (
                <div className="admin-overview">
                  {[
                    {
                      href: "/submit",
                      title: "Give your class a head start",
                      text: "Add a new assignment and its deadline.",
                      icon: "book",
                    },
                    {
                      href: "/announce",
                      title: "Keep everyone in the loop",
                      text: "Post a class update to the noticeboard.",
                      icon: "bell",
                    },
                    ...(role === "admin"
                      ? [
                          {
                            href: "/admin/invite",
                            title: "Build your class team",
                            text: "Invite an admin or course representative.",
                            icon: "users",
                          },
                        ]
                      : []),
                  ].map((a) => (
                    <Link key={a.href} href={a.href}>
                      <div>
                        <h3>{a.title}</h3>
                        <p>{a.text}</p>
                      </div>
                      <Icon name={a.icon} />
                    </Link>
                  ))}
                </div>
              ) : (
                <>
                  <div className="section-heading">
                    <h2>{tab}</h2>
                    <span className="count">{rows.length}</span>
                  </div>
                  <div className="filters">
                    <label className="search">
                      <Icon name="search" />
                      <input
                        aria-label={`Search ${tab.toLowerCase()}`}
                        placeholder={`Search ${tab.toLowerCase()}…`}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="admin-list">
                    {rows.length ? (
                      rows.map((a) => (
                        <div className="admin-row" key={a.id}>
                          <div>
                            <h3>
                              {a.student_name || a.assignment_title || a.title}
                            </h3>
                            <p>
                              {tab === "Students"
                                ? a.student_email
                                : tab === "Assignments"
                                  ? `${a.course_title} · Due ${formatDate(a.deadline_date)}`
                                  : a.body}
                            </p>
                            {tab === "Announcements" && (
                              <p>Posted by {a.posted_by}</p>
                            )}
                          </div>
                          {tab === "Students" ? (
                            <div className="row-actions">
                              <button
                                className="button secondary"
                                disabled={busy !== null}
                                onClick={() => remindStudent(a)}
                              >
                                {busy === `${a.id}:preview`
                                  ? "Checking…"
                                  : "Preview"}
                              </button>
                              <button
                                className="button primary"
                                disabled={busy !== null}
                                onClick={() => remindStudent(a, true)}
                              >
                                {busy === `${a.id}:send`
                                  ? "Sending…"
                                  : "Send reminder"}
                              </button>
                              <button
                                className="delete-button"
                                disabled={busy !== null}
                                onClick={() => remove("students", a.id)}
                              >
                                {busy === a.id ? "Removing…" : "Remove"}
                              </button>
                            </div>
                          ) : tab !== "Announcements" ? (
                            <button
                              className="delete-button"
                              disabled={busy === a.id}
                              onClick={() => remove(tab.toLowerCase(), a.id)}
                            >
                              {busy === a.id
                                ? "Removing…"
                                : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <span className="empty-icon">
                          <Icon name="search" />
                        </span>
                        <h3>
                          {query
                            ? "No matches found"
                            : `No ${tab.toLowerCase()} yet`}
                        </h3>
                        <p>
                          {query
                            ? "Try a different search."
                            : "New items will appear here."}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </>
        )
      )}
    </>
  );
}
