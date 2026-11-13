"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../../components/icon";
import { trackPilotEvent } from "../../lib/pilot-events";

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
  const [course, setCourse] = useState("all");
  const [sort, setSort] = useState("newest");
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

  const courses = useMemo(() => Array.from(items.reduce((courseMap, item) => {
    if (!courseMap.has(item.course_code)) courseMap.set(item.course_code, {
      code: item.course_code,
      title: item.course_title,
    });
    return courseMap;
  }, new Map()).values()).sort((left, right) => left.code.localeCompare(right.code, undefined, { numeric: true })), [items]);

  const groups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visible = items.filter((item) => {
      const matchesCourse = course === "all" || item.course_code === course;
      const searchText = `${item.course_code} ${item.course_title} ${item.title} ${item.description || ""} ${item.file_name}`.toLowerCase();
      return matchesCourse && (!normalizedQuery || searchText.includes(normalizedQuery));
    }).sort((left, right) => {
      if (sort === "oldest") return new Date(left.created_at) - new Date(right.created_at);
      if (sort === "title") return left.title.localeCompare(right.title, undefined, { numeric: true });
      return new Date(right.created_at) - new Date(left.created_at);
    });
    const grouped = new Map();
    for (const item of visible) {
      if (!grouped.has(item.course_code)) grouped.set(item.course_code, {
        label: `${item.course_code} · ${item.course_title}`,
        materials: [],
      });
      grouped.get(item.course_code).materials.push(item);
    }
    return Array.from(grouped.values())
      .sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }))
      .map((group) => [group.label, group.materials]);
  }, [items, query, course, sort]);

  return <>
    <div className="page-heading"><div><h1>Study materials<span>.</span></h1><p>Find notes, slides and files by course.</p></div></div>
    {error && <div className="notice error" role="alert">{error}<button className="text-button" onClick={load}>Try again</button></div>}
    <section className="panel focused-page-panel">
      <div className="filters page-filters material-library-filters">
        <label className="search"><Icon name="search" /><input aria-label="Search materials" placeholder="Search titles or file names…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select aria-label="Choose a course" value={course} onChange={(event) => setCourse(event.target.value)}><option value="all">All courses ({courses.length})</option>{courses.map((item) => <option value={item.code} key={item.code}>{item.code} · {item.title}</option>)}</select>
        <select aria-label="Sort materials" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select>
      </div>
      {loading ? <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div> : groups.length ? <div className="material-groups">{groups.map(([courseName, materials]) => <section className="material-course" key={courseName}><div className="material-course-heading"><h2>{courseName}</h2><span>{materials.length} file{materials.length === 1 ? "" : "s"}</span></div><div className="material-list">{materials.map((item) => { const [icon, type] = fileDetails(item); return <a key={item.id} href={item.download_url} target="_blank" rel="noreferrer" onClick={() => trackPilotEvent("material_download", "/materials")}><span className={`list-icon material-type ${icon}`}><Icon name={icon} size={18} /></span><span><span className="material-title-line"><strong>{item.title}</strong>{isNew(item.created_at) && <em>New</em>}</span><small>{type} · {fileSize(item.file_size)}{uploadedDate(item.created_at) ? ` · Added ${uploadedDate(item.created_at)}` : ""}</small>{item.description && <small className="material-description">{item.description}</small>}<small className="material-file-name">{item.file_name}</small></span><Icon name="arrow" size={16} /></a>; })}</div></section>)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name="book" /></span><h3>{items.length ? "No matching materials" : "No materials yet"}</h3><p>{items.length ? "Try another course, search term or sort option." : "Course files uploaded by our administrators will appear here."}</p>{!items.length && <Link className="empty-action" href="/assignments">Check assignments <Icon name="arrow" size={15} /></Link>}</div>}
    </section>
  </>;
}
