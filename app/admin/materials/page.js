"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "../../../components/icon";
import WorkspaceHeading from "../../../components/workspace-heading";
import { useWorkspaceSession } from "../../../lib/use-workspace-session";
import { uploadClassFile } from "../../../lib/upload-class-file";
import FilePicker from "../../../components/file-picker";

const emptyForm = { courseCode: "", courseTitle: "", title: "", description: "" };

export default function AdminMaterialsPage() {
  const workspace = useWorkspaceSession();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/materials", { cache: "no-store" });
    const data = await response.json();
    if (response.ok && Array.isArray(data)) setItems(data);
    setLoading(false);
  }, []);
  useEffect(() => {
    // Initial materials synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function submit(event) {
    event.preventDefault(); setError(""); setNotice("");
    const formElement = event.currentTarget;
    if (!file) { setError("Choose a file to upload."); return; }
    setBusy("upload");
    try {
      await uploadClassFile({ file, accessToken: workspace.accessToken, kind: "material", courseCode: form.courseCode, record: form });
      setForm(emptyForm); setFile(null); formElement.reset();
      setNotice("Study material uploaded."); await load();
    } catch (uploadError) { setError(uploadError.message); }
    finally { setBusy(""); }
  }

  async function remove(item) {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    setBusy(item.id); setError("");
    try {
      const response = await fetch(`/api/materials/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${workspace.accessToken}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Material could not be deleted.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (removeError) { setError(removeError.message); }
    finally { setBusy(""); }
  }

  return <>
    <WorkspaceHeading eyebrow="ADMIN · MATERIALS" title="Study materials" description="Upload notes and files under the right course." user={workspace.user} role={workspace.role} onSignOut={workspace.signOut} />
    {(workspace.error || error) && <div className="notice error" role="alert">{workspace.error || error}</div>}
    {notice && <div className="notice success" role="status">{notice}</div>}
    {!workspace.loading && workspace.isAdmin && <section className="panel material-upload-panel"><div className="section-heading"><div><p className="eyebrow">ADD A FILE</p><h2>Upload course material</h2></div></div><form onSubmit={submit}>
      <div className="field-row"><label className="field"><span>Course code</span><input required value={form.courseCode} onChange={(event) => setForm({ ...form, courseCode: event.target.value })} placeholder="BME 411" /></label><label className="field"><span>Course title</span><input required value={form.courseTitle} onChange={(event) => setForm({ ...form, courseTitle: event.target.value })} placeholder="Biomaterials" /></label></div>
      <label className="field"><span>Material title</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Week 3 lecture slides" /></label>
      <label className="field"><span>Short description (optional)</span><textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      <div className="field"><span>File (maximum 20 MB)</span><FilePicker id="material_file" files={file ? [file] : []} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] || null)} /></div>
      <button className="button primary" disabled={busy === "upload"}>{busy === "upload" ? "Uploading…" : "Upload material"}<Icon name="arrow" size={16} /></button>
    </form></section>}
    <section className="panel focused-page-panel material-admin-list">{loading ? <div className="skeleton-list"><div className="skeleton" /></div> : items.length ? <div className="management-list">{items.map((item) => <article key={item.id}><span className="list-icon"><Icon name="book" size={18} /></span><div><small>{item.course_code} · {item.course_title}</small><h3>{item.title}</h3><p>{item.file_name}</p></div>{workspace.isAdmin && <button className="button danger" disabled={Boolean(busy)} onClick={() => remove(item)}>{busy === item.id ? "Deleting…" : "Delete"}</button>}</article>)}</div> : <div className="empty-state"><h3>No materials uploaded</h3><p>Use the form above to add the first course file.</p></div>}</section>
  </>;
}
