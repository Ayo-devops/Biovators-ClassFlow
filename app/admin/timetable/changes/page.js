"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FormPage, { Field } from "../../../../components/form-page";
import Icon from "../../../../components/icon";
import { supabase } from "../../../../lib/supabase";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const initialChange = {
  change_date: "",
  moved_to_date: "",
  entry_id: "",
  change_type: "cancelled",
  new_start_time: "",
  new_end_time: "",
  new_venue: "",
  course_code: "",
  course_title: "",
  note: "",
};

function timeValue(value) {
  return String(value || "").slice(0, 5);
}

export default function TimetableChangesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [entries, setEntries] = useState([]);
  const [changes, setChanges] = useState([]);
  const [form, setForm] = useState(initialChange);
  const [preview, setPreview] = useState(null);
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
    try {
      const response = await authFetch("/api/timetable/changes");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not load timetable changes.");
      setEntries(data.entries || []);
      setChanges(data.changes || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, token]);

  useEffect(() => {
    // Synchronize timetable changes after the authenticated session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const eligibleEntries = useMemo(() => {
    if (!form.change_date) return entries;
    const date = new Date(`${form.change_date}T12:00:00Z`);
    const jsDay = date.getUTCDay();
    const weekday = jsDay === 0 ? 7 : jsDay;
    return entries.filter((entry) => Number(entry.day_of_week) === weekday);
  }, [entries, form.change_date]);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "change_date" ? { entry_id: "" } : {}),
    }));
    setPreview(null);
  }

  async function previewDate(date = form.change_date) {
    if (!date) {
      setError("Choose the affected date first.");
      return;
    }
    setBusy("preview");
    setError("");
    try {
      const response = await authFetch(
        `/api/timetable/announce-change?date=${date}`,
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

  async function save(event) {
    event.preventDefault();
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const response = await authFetch("/api/timetable/changes", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the change.");
      setNotice("Timetable change saved. Every future preview will use it.");
      const affectedDate =
        form.change_type === "moved" ? form.moved_to_date : form.change_date;
      setForm(initialChange);
      await load();
      await previewDate(affectedDate);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  }

  async function remove(change) {
    if (!window.confirm("Remove this one-off timetable change?")) return;
    setBusy(`delete:${change.id}`);
    try {
      const response = await authFetch(
        `/api/timetable/changes/${change.id}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not remove the change.");
      setNotice("Timetable change removed.");
      setPreview(null);
      await load();
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setBusy("");
    }
  }

  async function announce() {
    if (!preview?.message || !preview.group) {
      setError(
        preview?.group
          ? "There is no schedule to announce for this date."
          : "An administrator must select the timetable WhatsApp group first.",
      );
      return;
    }
    if (
      !window.confirm(
        `Send this timetable correction to “${preview.group}” now?`,
      )
    )
      return;
    setBusy("announce");
    setError("");
    try {
      const response = await authFetch("/api/timetable/announce-change", {
        method: "POST",
        body: JSON.stringify({ date: preview.date, confirm: true }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not announce the change.");
      setNotice(`Timetable correction sent to ${data.group}.`);
    } catch (announceError) {
      setError(announceError.message);
    } finally {
      setBusy("");
    }
  }

  const type = form.change_type;
  const needsEntry = type !== "added";

  return (
    <FormPage
      title="Keep our timetable accurate."
      description="Record a cancellation, move, venue change, or extra class for one date without changing every future week."
      icon="calendar"
      back="/admin"
    >
      <div className="timetable-links">
        <a className="button secondary" href="/admin/timetable">
          Weekly schedule and reminders <Icon name="arrow" size={16} />
        </a>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      <section className="timetable-section">
        <h2>Change one day’s schedule</h2>
        <p>This change will apply only to the date you choose.</p>
        <form onSubmit={save}>
          <div className="field-row">
            <Field
              name="change_date"
              label="Original or affected date"
              type="date"
              value={form.change_date}
              onChange={update}
              required
            />
            <Field
              name="change_type"
              label="Change"
              options={[
                { value: "cancelled", label: "Cancelled class" },
                { value: "moved", label: "Moved class" },
                { value: "venue_changed", label: "Venue changed" },
                { value: "added", label: "Extra class" },
              ]}
              value={form.change_type}
              onChange={update}
            />
          </div>

          {needsEntry && (
            <Field
              name="entry_id"
              label="Class"
              options={[
                { value: "", label: form.change_date ? "Choose a class" : "Choose the date first" },
                ...eligibleEntries.map((entry) => ({
                  value: entry.id,
                  label: `${timeValue(entry.start_time)} · ${entry.course_code} · ${entry.venue}`,
                })),
              ]}
              value={form.entry_id}
              onChange={update}
              required
            />
          )}

          {type === "added" && (
            <>
              <div className="field-row">
                <Field name="course_code" label="Course code" value={form.course_code} onChange={update} required />
                <Field name="course_title" label="Course title" value={form.course_title} onChange={update} required />
              </div>
            </>
          )}

          {type === "moved" && (
            <Field name="moved_to_date" label="New date" type="date" value={form.moved_to_date} onChange={update} required />
          )}

          {["moved", "added"].includes(type) && (
            <div className="field-row">
              <Field name="new_start_time" label="New start" type="time" value={form.new_start_time} onChange={update} required />
              <Field name="new_end_time" label="New end" type="time" value={form.new_end_time} onChange={update} required />
            </div>
          )}

          {["moved", "venue_changed", "added"].includes(type) && (
            <Field name="new_venue" label="New venue" value={form.new_venue} onChange={update} required={type !== "moved"} />
          )}

          <Field name="note" label="Note (optional)" multiline value={form.note} onChange={update} placeholder="Why did this change?" />
          <button className="button primary" disabled={busy === "save" || loading}>
            {busy === "save" ? "Saving…" : "Save this change"}
          </button>
        </form>
      </section>

      <section className="timetable-section">
        <div className="section-heading compact">
          <div>
            <h2>Resulting message</h2>
            <p>Preview first. Sending a correction always asks for confirmation.</p>
          </div>
          <button className="button secondary" onClick={() => previewDate()} disabled={busy === "preview"}>
            {busy === "preview" ? "Building…" : "Preview date"}
          </button>
        </div>
        {preview && (
          <div className="timetable-preview">
            <pre>{preview.message || "No classes are scheduled for this date."}</pre>
            <button className="button primary" onClick={announce} disabled={busy === "announce" || !preview.message}>
              {busy === "announce" ? "Sending…" : `Announce change to ${preview.group || "selected group"}`}
            </button>
          </div>
        )}
      </section>

      <section className="timetable-section">
        <h2>Recent date changes</h2>
        {loading ? (
          <p role="status">Loading changes…</p>
        ) : changes.length ? (
          <div className="timetable-list">
            {changes.map((change) => {
              const base = entries.find(
                (entry) => String(entry.id) === String(change.entry_id),
              );
              return (
                <div className="timetable-row" key={change.id}>
                  <div>
                    <span>{change.change_date} · {change.change_type.replace("_", " ")}</span>
                    <strong>{change.course_code || base?.course_code || "Timetable change"}</strong>
                    <p>
                      {change.moved_to_date ? `Moved to ${change.moved_to_date} · ` : ""}
                      {change.new_start_time ? `${timeValue(change.new_start_time)} · ` : ""}
                      {change.new_venue || change.note || "Saved change"}
                    </p>
                  </div>
                  <button className="delete-button" disabled={Boolean(busy)} onClick={() => remove(change)}>
                    {busy === `delete:${change.id}` ? "Removing…" : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="notice">No date changes have been added yet.</div>
        )}
      </section>
    </FormPage>
  );
}
