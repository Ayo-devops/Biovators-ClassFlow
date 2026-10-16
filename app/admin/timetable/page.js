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
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSettingsForm, setShowSettingsForm] = useState(false);
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
      const [entriesResponse, settingsResponse] = await Promise.all([
        authFetch("/api/timetable/entries"),
        authFetch("/api/timetable/settings"),
      ]);
      const [entryData, settingData] = await Promise.all([
        entriesResponse.json(),
        settingsResponse.json(),
      ]);
      if ([entriesResponse, settingsResponse].some((item) => item.status === 403)) {
        router.replace("/admin");
        return;
      }
      if (!entriesResponse.ok)
        throw new Error(entryData.error || "Could not load the timetable.");
      if (!settingsResponse.ok)
        throw new Error(settingData.error || "Could not load timetable settings.");
      setEntries(entryData);
      setSettings({
        ...settingData,
        evening_time: timeValue(settingData.evening_time),
        morning_time: timeValue(settingData.morning_time),
      });
      setLoading(false);

      try {
        const groupsResponse = await authFetch("/api/whatsapp/groups");
        const groupData = await groupsResponse.json();
        if (!groupsResponse.ok) {
          throw new Error(groupData.error || "Could not load WhatsApp groups.");
        }
        setGroups(Array.isArray(groupData.groups) ? groupData.groups : []);
      } catch (groupError) {
        setGroups([]);
        setError(
          `The timetable is available, but WhatsApp groups are offline: ${groupError.message}`,
        );
      }
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
      setShowClassForm(false);
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
    setShowClassForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEntry(item) {
    if (!window.confirm(`Delete ${item.course_code} from the weekly schedule?`))
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
      setShowSettingsForm(false);
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
      <FormPage title="Our class schedule." description="Loading the Biovators schedule…" icon="calendar" back="/admin" wide>
        <p role="status">Loading timetable controls…</p>
        {error && <div className="notice error">{error}</div>}
      </FormPage>
    );
  }

  return (
    <FormPage
      title="Our class schedule."
      description="Keep our weekly classes accurate and choose when ClassFlow should remind Biovators."
      icon="calendar"
      back="/admin"
      wide
    >
      <div className="timetable-links">
        <a className="button secondary" href="/admin/timetable/changes">
          Change a specific date <Icon name="arrow" size={16} />
        </a>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      <section className="timetable-section">
        <div className="section-heading compact">
          <div>
            <h2>Weekly class schedule</h2>
            <p>These classes repeat every week.</p>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setEditingId("");
              setEntry(emptyEntry);
              setShowClassForm((current) => !current);
            }}
          >
            {showClassForm && !editingId ? "Close form" : "Add a class"}
          </button>
        </div>
        {showClassForm && <form className="timetable-edit-form" onSubmit={saveEntry}>
          <h3>{editingId ? `Edit ${entry.course_code}` : "Add a class"}</h3>
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
                setShowClassForm(false);
              }}
            >
              Cancel editing
            </button>
          )}
        </form>}
        <div className="timetable-day-grid">
          {DAYS.map((day, index) => {
            const dayEntries = entries.filter((item) => Number(item.day_of_week) === index + 1);
            return (
              <article className="timetable-day-card" key={day}>
                <div className="timetable-day-heading"><h3>{day}</h3><span>{dayEntries.length}</span></div>
                {dayEntries.length ? dayEntries.map((item) => (
                  <div className="timetable-class" key={item.id}>
                    <strong>{item.course_code}</strong>
                    <p>{item.course_title}</p>
                    <small>{timeValue(item.start_time)}–{timeValue(item.end_time)} · {item.venue}</small>
                    <div className="row-actions">
                      <button className="button secondary" onClick={() => editEntry(item)}>Edit</button>
                      <button className="delete-button" disabled={Boolean(busy)} onClick={() => deleteEntry(item)}>
                        {busy === `delete:${item.id}` ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                )) : <p className="timetable-day-empty">No class</p>}
              </article>
            );
          })}
        </div>
      </section>

      <section className="timetable-section">
        <div className="section-heading compact">
          <div>
            <h2>Automatic reminder settings</h2>
            <p>{settings.auto_send_enabled ? "Reminders are on." : "Reminders are paused."} Class alerts are sent {settings.class_now_lead_minutes} minutes before class.</p>
          </div>
          <button type="button" className="button secondary" onClick={() => setShowSettingsForm((current) => !current)}>
            {showSettingsForm ? "Close settings" : "Edit settings"}
          </button>
        </div>
        {showSettingsForm && <form className="timetable-edit-form" onSubmit={saveSettings}>
          <label className="toggle-row">
            <input
              type="checkbox"
              name="auto_send_enabled"
              checked={settings.auto_send_enabled}
              onChange={updateSetting}
            />
            <span><strong>Send schedule reminders automatically</strong><small>Turn all automatic schedule messages on or off</small></span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" name="evening_enabled" checked={settings.evening_enabled} onChange={updateSetting} />
            <span><strong>Send tomorrow’s schedule</strong><small>Send it the evening before</small></span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" name="morning_enabled" checked={settings.morning_enabled} onChange={updateSetting} />
            <span><strong>Send today’s schedule</strong><small>Send it again in the morning</small></span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" name="class_now_enabled" checked={settings.class_now_enabled} onChange={updateSetting} />
            <span><strong>Send a class-starting-soon alert</strong><small>One alert before each class</small></span>
          </label>
          <div className="field-row">
            <Field name="evening_time" label="Evening time" type="time" value={settings.evening_time} onChange={updateSetting} />
            <Field name="morning_time" label="Morning time" type="time" value={settings.morning_time} onChange={updateSetting} />
          </div>
          <div className="field-row">
            <Field name="class_now_lead_minutes" label="How many minutes before class?" type="number" min="0" max="60" value={settings.class_now_lead_minutes} onChange={updateSetting} />
            <Field name="grace_minutes" label="How many minutes late can a reminder still go out?" type="number" min="1" max="30" value={settings.grace_minutes} onChange={updateSetting} />
          </div>
          <Field
            name="target_group_id"
            label="WhatsApp group for reminders"
            options={[
              { value: "", label: "Choose a WhatsApp group" },
              ...groups.map((group) => ({ value: group.id, label: group.name })),
            ]}
            value={settings.target_group_id}
            onChange={updateSetting}
          />
          <div className="skip-date-control">
            <Field name="skip_date" label="Do not send reminders on this date" type="date" value={skipDate} onChange={(event) => setSkipDate(event.target.value)} />
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
              Add date
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
            {busy === "settings" ? "Saving…" : "Save reminder settings"}
          </button>
        </form>}
      </section>

      <section className="timetable-section">
        <h2>Preview a reminder</h2>
        <p>See the exact message. Nothing will be sent.</p>
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
