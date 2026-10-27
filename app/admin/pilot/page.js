"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "../../../components/icon";
import WorkspaceHeading from "../../../components/workspace-heading";
import { useWorkspaceSession } from "../../../lib/use-workspace-session";

const TYPE_LABELS = {
  feedback: "General feedback",
  suggestion: "Suggestion",
  bug: "Bug",
  incorrect_information: "Incorrect information",
  delivery_failure: "Delivery failure",
  support_request: "Support request",
};
const PATH_LABELS = {
  "/": "Home",
  "/assignments": "Assignments",
  "/announcements": "Noticeboard",
  "/materials": "Materials",
  "/reminders": "Reminders",
  "/register": "Registration",
  "/update-phone": "Number update",
};
const EMPTY_FEEDBACK = {
  feedbackType: "feedback",
  area: "General",
  summary: "",
  severity: "minor",
  source: "student",
  affectedStudents: "",
};

function FeedbackItem({ item, accessToken, onSaved }) {
  const [status, setStatus] = useState(item.status);
  const [resolution, setResolution] = useState(item.resolution || "");
  const [minutesSpent, setMinutesSpent] = useState(item.minutes_spent ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/pilot/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id: item.id, status, resolution, minutesSpent }),
    });
    setSaving(false);
    if (response.ok) onSaved();
  }

  return <article className="pilot-feedback-card">
    <div className="pilot-feedback-head">
      <div><span className={`badge ${item.severity === "critical" ? "danger" : item.severity === "disruptive" ? "warning" : "green"}`}>{item.severity}</span><strong>{TYPE_LABELS[item.feedback_type] || item.feedback_type}</strong></div>
      <small>{new Date(item.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</small>
    </div>
    <h3>{item.area}</h3><p>{item.summary}</p>
    <small>Source: {item.source.replaceAll("_", " ")}{item.affected_students != null ? ` · ${item.affected_students} student${item.affected_students === 1 ? "" : "s"} affected` : ""}</small>
    <div className="pilot-resolution-grid">
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="new">New</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="deferred">Deferred</option><option value="declined">Declined</option></select></label>
      <label>Minutes spent<input type="number" min="0" value={minutesSpent} onChange={(event) => setMinutesSpent(event.target.value)} /></label>
      <label className="wide">Resolution or decision<textarea value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="What changed, or why was this deferred?" /></label>
      <button className="button secondary" type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save update"}</button>
    </div>
  </article>;
}

export default function PilotPage() {
  const workspace = useWorkspaceSession();
  const [insights, setInsights] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [form, setForm] = useState(EMPTY_FEEDBACK);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!workspace.accessToken || !workspace.isAdmin) return;
    setLoading(true); setError("");
    try {
      const headers = { Authorization: `Bearer ${workspace.accessToken}` };
      const [insightsResponse, feedbackResponse] = await Promise.all([
        fetch("/api/pilot/insights", { headers, cache: "no-store" }),
        fetch("/api/pilot/feedback", { headers, cache: "no-store" }),
      ]);
      const [insightsData, feedbackData] = await Promise.all([insightsResponse.json(), feedbackResponse.json()]);
      if (!insightsResponse.ok) throw new Error(insightsData.error || "Pilot insights could not be loaded.");
      if (!feedbackResponse.ok) throw new Error(feedbackData.error || "Feedback could not be loaded.");
      setInsights(insightsData); setFeedback(feedbackData);
      setSettings({
        pilotName: insightsData.settings.pilot_name,
        pilotStart: insightsData.settings.pilot_start,
        pilotEnd: insightsData.settings.pilot_end || "",
        eligibleStudents: insightsData.settings.eligible_students ?? "",
      });
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [workspace.accessToken, workspace.isAdmin]);

  useEffect(() => {
    // Load private pilot data after workspace authorization is established.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function submitFeedback(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const response = await fetch("/api/pilot/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${workspace.accessToken}` },
      body: JSON.stringify(form),
    });
    const data = await response.json(); setSaving(false);
    if (!response.ok) { setError(data.error || "Feedback could not be saved."); return; }
    setForm(EMPTY_FEEDBACK); setNotice("Feedback added to the pilot log."); load();
  }

  async function saveSettings(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const response = await fetch("/api/pilot/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${workspace.accessToken}` },
      body: JSON.stringify(settings),
    });
    const data = await response.json(); setSaving(false);
    if (!response.ok) { setError(data.error || "Pilot settings could not be saved."); return; }
    setNotice("Pilot details updated."); load();
  }

  const featureRows = Object.entries(insights?.usage?.byPath || {}).sort((a, b) => b[1] - a[1]);
  return <>
    <WorkspaceHeading eyebrow="BIOVATORS PILOT" title="Pilot insights" description="A small, privacy-conscious view of what students use and what needs attention." user={workspace.user} role={workspace.role} onSignOut={workspace.signOut} />
    {workspace.error && <div className="notice error" role="alert">{workspace.error}</div>}
    {!workspace.loading && workspace.user && !workspace.isAdmin && <div className="notice error" role="alert">Administrator access is required to view pilot evidence.</div>}
    {error && <div className="notice error" role="alert">{error}<button className="text-button" onClick={load}>Try again</button></div>}
    {notice && <div className="notice success" role="status">{notice}</div>}
    {workspace.isAdmin && (loading || !insights ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div> : <>
      <section className="stats compact-stats" aria-label="Seven-day pilot summary">
        <article className="stat-card"><div><span className="stat-icon green"><Icon name="users" /></span><span className="stat-value">{insights.usage.activeDevices}</span></div><h3>Active devices</h3><p>Approximate reach in the last 7 days.</p></article>
        <article className="stat-card"><div><span className="stat-icon purple"><Icon name="bell" /></span><span className="stat-value">{insights.reach.registered}</span></div><h3>Registered students</h3><p>{insights.reach.whatsapp} WhatsApp · {insights.reach.email} email.</p></article>
        <article className="stat-card"><div><span className="stat-icon orange"><Icon name="download" /></span><span className="stat-value">{insights.usage.byType.material_download || 0}</span></div><h3>Material reach</h3><p>Devices that opened a file this week.</p></article>
        <article className="stat-card"><div><span className="stat-icon purple"><Icon name="bell" /></span><span className="stat-value">{insights.feedback.open}</span></div><h3>Open feedback</h3><p>{insights.feedback.criticalOpen} critical · {insights.feedback.minutesSpent} minutes recorded.</p></article>
      </section>

      <section className="pilot-grid">
        <article className="panel pilot-panel"><div className="pilot-panel-heading"><div><p className="eyebrow">LAST 7 DAYS</p><h2>Feature reach</h2></div><span>{insights.usage.activeDevices} devices</span></div>
          {featureRows.length ? <div className="pilot-feature-list">{featureRows.map(([path, count]) => <div key={path}><span>{PATH_LABELS[path] || path}</span><strong>{count}</strong></div>)}</div> : <div className="home-inline-empty"><Icon name="clock" /><span><strong>Measurement has just started</strong><small>Feature reach will appear as students use ClassFlow.</small></span></div>}
        </article>
        <article className="panel pilot-panel"><div className="pilot-panel-heading"><div><p className="eyebrow">PILOT BASELINE</p><h2>Who can we reach?</h2></div></div>
          <div className="pilot-reach"><strong>{insights.settings.eligible_students || "Not set"}</strong><span>eligible students</span><p>{insights.reach.registered} registered · {insights.reach.whatsapp} with WhatsApp · {insights.reach.email} with email</p></div>
          <details className="pilot-settings"><summary>Edit pilot details</summary>{settings && <form onSubmit={saveSettings}><label>Pilot name<input value={settings.pilotName} onChange={(event) => setSettings({ ...settings, pilotName: event.target.value })} required /></label><div className="form-row"><label>Start date<input type="date" value={settings.pilotStart} onChange={(event) => setSettings({ ...settings, pilotStart: event.target.value })} required /></label><label>End date<input type="date" value={settings.pilotEnd} onChange={(event) => setSettings({ ...settings, pilotEnd: event.target.value })} /></label></div><label>Eligible students<input type="number" min="1" value={settings.eligibleStudents} onChange={(event) => setSettings({ ...settings, eligibleStudents: event.target.value })} placeholder="Enter the full class size" /></label><button className="button secondary" disabled={saving}>{saving ? "Saving…" : "Save pilot details"}</button></form>}</details>
        </article>
      </section>

      <section className="workspace-section"><div className="section-heading"><div><p className="eyebrow">FEEDBACK AND INCIDENTS</p><h2>Record what the numbers cannot explain</h2><p>Do not include phone numbers, email addresses, private messages or AI conversations.</p></div></div>
        <form className="panel pilot-feedback-form" onSubmit={submitFeedback}>
          <div className="form-row"><label>Type<select value={form.feedbackType} onChange={(event) => setForm({ ...form, feedbackType: event.target.value })}>{Object.entries(TYPE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Area<input value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} placeholder="Assignments, WhatsApp, materials…" required /></label></div>
          <label>What happened?<textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Describe the feedback or incident clearly." required /></label>
          <div className="form-row"><label>Severity<select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}><option value="minor">Minor</option><option value="disruptive">Disruptive</option><option value="critical">Critical</option></select></label><label>Source<select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}><option value="student">Student</option><option value="course_rep">Course representative</option><option value="administrator">Administrator</option><option value="automatic_monitoring">Automatic monitoring</option></select></label><label>Students affected<input type="number" min="0" value={form.affectedStudents} onChange={(event) => setForm({ ...form, affectedStudents: event.target.value })} placeholder="If known" /></label></div>
          <button className="button primary" disabled={saving}>{saving ? "Saving…" : "Add to pilot log"}<Icon name="arrow" size={16} /></button>
        </form>
        <div className="pilot-feedback-list">{feedback.length ? feedback.map((item) => <FeedbackItem item={item} accessToken={workspace.accessToken} onSaved={load} key={item.id} />) : <div className="empty-state"><span className="empty-icon"><Icon name="check" /></span><h3>No feedback recorded yet</h3><p>Add genuine comments, problems and support work as the pilot runs.</p></div>}</div>
      </section>

      <p className="pilot-privacy"><Icon name="shield" size={16} />{insights.privacy} Raw events are removed after 90 days.</p>
    </>)}
  </>;
}
