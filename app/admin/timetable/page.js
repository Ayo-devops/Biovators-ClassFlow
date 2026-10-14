"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormPage, { Field } from "../../../components/form-page";
import Icon from "../../../components/icon";
import { supabase } from "../../../lib/supabase";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const emptyEntry = {
  day_of_week: 1,
  start_time: "09:00",
  end_time: "10:00",
  course_code: "",
  course_title: "",
  venue: "",
  lecturer: "",
  active: true,
};

function timeValue(value) {
  return String(value || "").slice(0, 5);
}

export default function TimetableAdminPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [entries, setEntries] = useState([]);
  const [groups, setGroups] = useState([]);
  const [settings, setSettings] = useState(null);
  const [entry, setEntry] = useState(emptyEntry);
  const [editingId, setEditingId] = useState("");
  const [previewDate, setPreviewDate] = useState("");
  const [previewKind, setPreviewKind] = useState("morning");
  const [preview, setPreview] = useState(null);
  const [skipDate, setSkipDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const authFetch = useCallback(
    (url, options = {}) =>
      fetch(url, {
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
        cache: "no-store",
      }),
    [token],
  );

  useEffect(() => {
    async function authenticate() {
      if (!supabase) {
        setError("Sign-in is not configured.");
        setLoading(false);
        return;
      }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }
      if (!data.session) {
        router.replace("/admin/login");
        return;
      }
      setToken(data.session.access_token);
    }
    authenticate();
  }, [router]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [entriesResponse, settingsResponse, groupsResponse] =
        await Promise.all([
          authFetch("/api/timetable/entries"),
          authFetch("/api/timetable/settings"),
          authFetch("/api/whatsapp/groups"),
        ]);
      const [entryData, settingData, groupData] = await Promise.all([
        entriesResponse.json(),
        settingsResponse.json(),
        groupsResponse.json(),
      ]);
      if ([entriesResponse, settingsResponse].some((item) => item.status === 403)) {
        router.replace("/admin");
        return;
      }
      if (!entriesResponse.ok)
        throw new Error(entryData.error || "Could not load the timetable.");
      if (!settingsResponse.ok)
        throw new Error(settingData.error || "Could not load timetable settings.");
      if (!groupsResponse.ok)
        throw new Error(groupData.error || "Could not load WhatsApp groups.");
      setEntries(entryData);
      setSettings({
        ...settingData,
        evening_time: timeValue(settingData.evening_time),
        morning_time: timeValue(settingData.morning_time),
      });
      setGroups(Array.isArray(groupData.groups) ? groupData.groups : []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, router, token]);

  useEffect(() => {
    // Synchronize timetable data after the authenticated session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function updateEntry(event) {
    const { name, value, type, checked } = event.target;
    setEntry((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : name === "day_of_week"
            ? Number(value)
            : value,
    }));
  }

  async function saveEntry(event) {
    event.preventDefault();
    setBusy("entry");
    setError("");
    setNotice("");
    try {
      const response = await authFetch(
        editingId
          ? `/api/timetable/entries/${editingId}`
          : "/api/timetable/entries",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(entry),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the class.");
      setNotice(editingId ? "Timetable class updated." : "Timetable class added.");
      setEntry(emptyEntry);
      setEditingId("");
      await load();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  }

  function editEntry(item) {
    setEditingId(String(item.id));
    setEntry({
      ...item,
      start_time: timeValue(item.start_time),
      end_time: timeValue(item.end_time),
      lecturer: item.lecturer || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEntry(item) {
    if (!window.confirm(`Delete ${item.course_code} from the base timetable?`))
      return;
    setBusy(`delete:${item.id}`);
    try {
      const response = await authFetch(`/api/timetable/entries/${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete the class.");
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusy("");
    }
  }

  function updateSetting(event) {
    const { name, value, type, checked } = event.target;
    setSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setBusy("settings");
    setError("");
    setNotice("");
    try {
      const group = groups.find((item) => item.id === settings.target_group_id);
      const response = await authFetch("/api/timetable/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...settings,
          class_now_lead_minutes: Number(settings.class_now_lead_minutes),
          grace_minutes: Number(settings.grace_minutes),
          target_group_name: group?.name || "",
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save timetable settings.");
      setSettings({
        ...data,
        evening_time: timeValue(data.evening_time),
        morning_time: timeValue(data.morning_time),
      });
      setNotice(
        data.auto_send_enabled
          ? "Automation settings saved and enabled."
          : "Settings saved. Automatic sends remain paused.",
      );
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  }

  async function loadPreview() {
    if (!previewDate) {
      setError("Choose a preview date.");
      return;
    }
    setBusy("preview");
    setError("");
    try {
      const response = await authFetch(
        `/api/timetable/preview?date=${previewDate}&kind=${previewKind}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create preview.");
      setPreview(data);
    } catch (previewError) {
      setError(previewError.message);
    } finally {
      setBusy("");
    }
  }

  if (loading || !settings) {
    return (
      <FormPage title="Our automated timetable." description="Loading the Biovators schedule…" icon="calendar" back="/admin">
        <p role="status">Loading timetable controls…</p>
        {error && <div className="notice error">{error}</div>}
      </FormPage>
    );
  }

  return (
    <FormPage
      title="Our automated timetable."
      description="Manage the permanent class schedule, safe previews, and exactly when ClassFlow should keep Biovators informed."
      icon="calendar"
      back="/admin"
    >
      <div className="timetable-links">
        <a className="button secondary" href="/admin/timetable/changes">
          Manage one-off changes <Icon name="arrow" size={16} />
        </a>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      <section className="timetable-section">
        <h2>{editingId ? "Edit base class" : "Add a base class"}</h2>
        <p>Permanent weekly changes belong here. One-off changes use the changes page.</p>
        <form onSubmit={saveEntry}>
          <div className="field-row">
            <Field
              name="day_of_week"
              label="Day"
              options={DAYS.map((day, index) => ({
                value: index + 1,
                label: day,
              }))}
              value={entry.day_of_week}
              onChange={updateEntry}
            />
            <Field
              name="course_code"
              label="Course code"
              value={entry.course_code}
              onChange={updateEntry}
              required
            />
          </div>
          <Field
            name="course_title"
            label="Course title"
            value={entry.course_title}
            onChange={updateEntry}
            required
          />
          <div className="field-row">
            <Field
              name="start_time"
              label="Start"
              type="time"
              value={entry.start_time}
              onChange={updateEntry}
              required
            />
            <Field
              name="end_time"
              label="End"
              type="time"
              value={entry.end_time}
              onChange={updateEntry}
              required
            />
          </div>
          <div className="field-row">
            <Field
              name="venue"
              label="Venue"
              value={entry.venue}
              onChange={updateEntry}
              required
            />
            <Field
              name="lecturer"
              label="Lecturer (optional)"
              value={entry.lecturer}
              onChange={updateEntry}
            />
          </div>
          <button className="button primary" disabled={busy === "entry"}>
            {busy === "entry" ? "Saving…" : editingId ? "Save changes" : "Add class"}
          </button>
          {editingId && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setEditingId("");
                setEntry(emptyEntry);
              }}
            >
              Cancel editing
            </button>
          )}
        </form>
      </section>

      <section className="timetable-section">
        <h2>Base timetable</h2>
        <div className="timetable-list">
          {entries.map((item) => (
            <div className="timetable-row" key={item.id}>
              <div>
                <span>{DAYS[Number(item.day_of_week) - 1]}</span>
                <strong>{item.course_code} · {item.course_title}</strong>
                <p>{timeValue(item.start_time)}–{timeValue(item.end_time)} · {item.venue}</p>
              </div>
              <div className="row-actions">
                <button className="button secondary" onClick={() => editEntry(item)}>
                  Edit
                </button>
                <button
                  className="delete-button"
                  disabled={Boolean(busy)}
                  onClick={() => deleteEntry(item)}
                >
                  {busy === `delete:${item.id}` ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="timetable-section">
        <h2>Automation settings</h2>
        <p>
          Automation is safe by default: it stays paused until a group is selected
          and the master switch is enabled.
        </p>
        <form onSubmit={saveSettings}>
          <label className="toggle-row">
            <input
              type="checkbox"
              name="auto_send_enabled"
              checked={settings.auto_send_enabled}
              onChange={updateSetting}
            />
            <span><strong>Enable automatic timetable messages</strong><small>Master pause switch</small></span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" name="evening_enabled" checked={settings.evening_enabled} onChange={updateSetting} />
            <span><strong>Tomorrow’s Schedule</strong><small>Evening preview</small></span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" name="morning_enabled" checked={settings.morning_enabled} onChange={updateSetting} />
            <span><strong>Today’s Schedule</strong><small>Morning refresh</small></span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" name="class_now_enabled" checked={settings.class_now_enabled} onChange={updateSetting} />
            <span><strong>Class Starting Soon</strong><small>One alert per class block</small></span>
          </label>
          <div className="field-row">
            <Field name="evening_time" label="Evening time" type="time" value={settings.evening_time} onChange={updateSetting} />
            <Field name="morning_time" label="Morning time" type="time" value={settings.morning_time} onChange={updateSetting} />
          </div>
          <div className="field-row">
            <Field name="class_now_lead_minutes" label="Starting-soon lead (minutes)" type="number" min="0" max="60" value={settings.class_now_lead_minutes} onChange={updateSetting} />
            <Field name="grace_minutes" label="Late-send grace (minutes)" type="number" min="1" max="30" value={settings.grace_minutes} onChange={updateSetting} />
          </div>
          <Field
            name="target_group_id"
            label="400-level material group"
            options={[
              { value: "", label: "Choose a WhatsApp group" },
              ...groups.map((group) => ({ value: group.id, label: group.name })),
            ]}
            value={settings.target_group_id}
            onChange={updateSetting}
          />
          <div className="skip-date-control">
            <Field name="skip_date" label="Skip date (holiday, strike, exams)" type="date" value={skipDate} onChange={(event) => setSkipDate(event.target.value)} />
            <button
              type="button"
              className="button secondary"
              disabled={!skipDate}
              onClick={() => {
                setSettings((current) => ({
                  ...current,
                  skip_dates: [...new Set([...(current.skip_dates || []), skipDate])].sort(),
                }));
                setSkipDate("");
              }}
            >
              Add skip date
            </button>
          </div>
          {!!settings.skip_dates?.length && (
            <div className="skip-date-list">
              {settings.skip_dates.map((date) => (
                <button
                  type="button"
                  key={date}
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      skip_dates: current.skip_dates.filter((item) => item !== date),
                    }))
                  }
                >
                  {date} ×
                </button>
              ))}
            </div>
          )}
          <button className="button primary" disabled={busy === "settings"}>
            {busy === "settings" ? "Saving…" : "Save automation settings"}
          </button>
        </form>
      </section>

      <section className="timetable-section">
        <h2>Safe message preview</h2>
        <p>Build the exact message without sending anything.</p>
        <div className="field-row">
          <Field name="preview_date" label="Schedule date" type="date" value={previewDate} onChange={(event) => setPreviewDate(event.target.value)} />
          <Field
            name="preview_kind"
            label="Message"
            options={[
              { value: "morning", label: "Today’s Schedule" },
              { value: "evening", label: "Tomorrow’s Schedule" },
              { value: "class_now", label: "Class Starting Soon alerts" },
            ]}
            value={previewKind}
            onChange={(event) => setPreviewKind(event.target.value)}
          />
        </div>
        <button className="button secondary" type="button" onClick={loadPreview} disabled={busy === "preview"}>
          {busy === "preview" ? "Building preview…" : "Preview without sending"}
        </button>
        {preview && (
          <div className="timetable-preview" role="status">
            {preview.messages
              ? preview.messages.map((item) => <pre key={item.slot}>{item.message}</pre>)
              : <pre>{preview.message || "No message: this day has no classes."}</pre>}
          </div>
        )}
      </section>
    </FormPage>
  );
}
