import { authorizeAdmin } from "../../../../lib/admin-auth";
import { filesSupabase } from "../../../../lib/class-files-server";

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "been", "before", "being", "class", "could",
  "does", "from", "have", "into", "just", "more", "most", "should", "some",
  "tell", "than", "that", "their", "there", "these", "they", "this", "what",
  "when", "where", "which", "with", "would", "your",
]);

function termsFor(query) {
  return [...new Set(String(query || "").toLowerCase().match(/[a-z0-9]{3,}/g) || [])]
    .filter((term) => !STOP_WORDS.has(term))
    .slice(0, 12);
}

function chunksFor(text, size = 1700, overlap = 220) {
  const clean = String(text || "").trim();
  if (!clean) return [];
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const boundary = Math.max(clean.lastIndexOf("\n", end), clean.lastIndexOf(". ", end));
      if (boundary > start + size * 0.6) end = boundary + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

function occurrences(text, term) {
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(term, index)) !== -1 && count < 6) {
    count += 1;
    index += term.length;
  }
  return count;
}

export async function GET(request) {
  const authorization = await authorizeAdmin(request, {
    allowReminderKey: true,
    allowWorkerKey: true,
  });
  if (authorization.error) return authorization.error;
  if (!filesSupabase) {
    return Response.json({ error: "Material search is not configured." }, { status: 503 });
  }

  const query = new URL(request.url).searchParams.get("query")?.trim() || "";
  const terms = termsFor(query);
  if (!terms.length) return Response.json({ query, sources: [] });

  const { data: materials, error } = await filesSupabase
    .from("course_materials")
    .select("id, course_code, course_title, title, file_name, ai_text")
    .eq("ai_status", "ready")
    .not("ai_text", "is", null)
    .limit(60);
  if (error) {
    return Response.json(
      { error: "Material AI search is not ready. Apply the material AI migration first." },
      { status: 503 },
    );
  }

  const ranked = [];
  for (const material of materials || []) {
    const metadata = `${material.course_code} ${material.course_title} ${material.title} ${material.file_name}`.toLowerCase();
    for (const excerpt of chunksFor(material.ai_text)) {
      const lower = excerpt.toLowerCase();
      const matchedTerms = terms.filter((term) => lower.includes(term) || metadata.includes(term));
      if (!matchedTerms.length) continue;
      const contentScore = matchedTerms.reduce((sum, term) => sum + occurrences(lower, term), 0);
      const metadataScore = matchedTerms.filter((term) => metadata.includes(term)).length * 4;
      const phraseScore = lower.includes(query.toLowerCase()) ? 10 : 0;
      ranked.push({
        score: contentScore + metadataScore + phraseScore,
        courseCode: material.course_code,
        courseTitle: material.course_title,
        title: material.title,
        fileName: material.file_name,
        excerpt,
      });
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  const used = new Map();
  const sources = [];
  for (const item of ranked) {
    const count = used.get(item.fileName) || 0;
    if (count >= 2) continue;
    used.set(item.fileName, count + 1);
    sources.push(item);
    if (sources.length >= 6) break;
  }
  return Response.json({ query, sources });
}
