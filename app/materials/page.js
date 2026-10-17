"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../../components/icon";

function fileSize(bytes) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileDetails(item) {
  const extension = String(item.file_name || "").split(".").pop().toLowerCase();
  const types = {
    pdf: ["pdf", "PDF"],
    ppt: ["slides", "PowerPoint"],
    pptx: ["slides", "PowerPoint"],
    doc: ["file", "Word"],
    docx: ["file", "Word"],
    xls: ["table", "Excel"],
    xlsx: ["table", "Excel"],
    jpg: ["image", "Image"],
    jpeg: ["image", "Image"],
    png: ["image", "Image"],
    txt: ["file", "Text"],
  };
  return types[extension] || ["file", extension ? extension.toUpperCase() : "File"];
}

function isNew(date) {
  const created = new Date(date).getTime();
  return Number.isFinite(created) && Date.now() - created < 7 * 86400000;
}

function uploadedDate(date) {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? "" : value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function MaterialsPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/materials", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Materials could not be loaded.");
      setItems(data);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // Initial materials synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const groups = useMemo(() => {
    const visible = items.filter((item) => `${item.course_code} ${item.course_title} ${item.title}`.toLowerCase().includes(query.toLowerCase()));
    return Object.entries(visible.reduce((grouped, item) => {
      const key = `${item.course_code} · ${item.course_title}`;
      grouped[key] = [...(grouped[key] || []), item];
      return grouped;
    }, {}));
  }, [items, query]);

  return <>
    <div className="page-heading"><div><h1>Study materials<span>.</span></h1><p>Find notes, slides and files by course.</p></div></div>
    {error && <div className="notice error" role="alert">{error}<button className="text-button" onClick={load}>Try again</button></div>}
    <section className="panel focused-page-panel">
      <div className="filters page-filters"><label className="search"><Icon name="search" /><input aria-label="Search materials" placeholder="Search by course or material…" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      {loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div> : groups.length ? <div className="material-groups">{groups.map(([course, materials]) => <section className="material-course" key={course}><div className="material-course-heading"><h2>{course}</h2><span>{materials.length} file{materials.length === 1 ? "" : "s"}</span></div><div className="material-list">{materials.map((item) => { const [icon, type] = fileDetails(item); return <a key={item.id} href={item.download_url} target="_blank" rel="noreferrer"><span className={`list-icon material-type ${icon}`}><Icon name={icon} size={18} /></span><span><span className="material-title-line"><strong>{item.title}</strong>{isNew(item.created_at) && <em>New</em>}</span><small>{type} · {fileSize(item.file_size)}{uploadedDate(item.created_at) ? ` · Added ${uploadedDate(item.created_at)}` : ""}</small><small className="material-file-name">{item.file_name}</small></span><Icon name="arrow" size={16} /></a>; })}</div></section>)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name="book" /></span><h3>No materials yet</h3><p>Course files uploaded by our administrators will appear here.</p><Link className="empty-action" href="/assignments">Check assignments <Icon name="arrow" size={15} /></Link></div>}
    </section>
  </>;
}
