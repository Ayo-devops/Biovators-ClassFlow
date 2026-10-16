import "server-only";

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

export const FILE_BUCKET = "classflow-files";
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/jpeg",
  "image/png",
]);

export const filesSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      )
    : null;

function cleanSegment(value, fallback = "file") {
  const cleaned = String(value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return cleaned || fallback;
}

export function validateFileDetails({ fileName, fileType, fileSize }) {
  const size = Number(fileSize);
  if (!fileName || !fileType || !Number.isFinite(size)) {
    return "Choose a valid file.";
  }
  if (!ALLOWED_FILE_TYPES.has(fileType)) {
    return "Use a PDF, Word, PowerPoint, Excel, text, JPG or PNG file.";
  }
  if (size <= 0 || size > MAX_FILE_SIZE) {
    return "Each file must be 20 MB or smaller.";
  }
  return "";
}

export function makeStoragePath(folder, fileName) {
  return `${cleanSegment(folder)}/${randomUUID()}-${cleanSegment(fileName)}`;
}

export async function signedFiles(rows = []) {
  if (!filesSupabase || !rows.length) return rows;
  const paths = rows.map((row) => row.storage_path);
  const { data, error } = await filesSupabase.storage
    .from(FILE_BUCKET)
    .createSignedUrls(paths, 60 * 60);
  if (error) return rows;
  const urls = new Map(data.map((item) => [item.path, item.signedUrl]));
  return rows.map((row) => ({ ...row, download_url: urls.get(row.storage_path) || "" }));
}
