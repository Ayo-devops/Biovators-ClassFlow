"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../../components/icon";

function fileSize(bytes) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
    <div className="page-heading"><div><p className="eyebrow">OUR COURSE LIBRARY</p><h1>Study materials<span>.</span></h1><p>Notes, slides and useful class files—organized by course.</p></div></div>
    {error && <div className="notice error" role="alert">{error}<button className="text-button" onClick={load}>Try again</button></div>}
    <section className="panel focused-page-panel">
      <div className="filters page-filters"><label className="search"><Icon name="search" /><input aria-label="Search materials" placeholder="Search by course or material…" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      {loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div> : groups.length ? <div className="material-groups">{groups.map(([course, materials]) => <section className="material-course" key={course}><div className="material-course-heading"><h2>{course}</h2><span>{materials.length} file{materials.length === 1 ? "" : "s"}</span></div><div className="material-list">{materials.map((item) => <a key={item.id} href={item.download_url} target="_blank" rel="noreferrer"><span className="list-icon"><Icon name="download" size={18} /></span><span><strong>{item.title}</strong><small>{item.description || item.file_name} · {fileSize(item.file_size)}</small></span><Icon name="arrow" size={16} /></a>)}</div></section>)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name="book" /></span><h3>No materials yet</h3><p>Course files uploaded by our administrators will appear here.</p></div>}
    </section>
  </>;
}
