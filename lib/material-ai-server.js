import "server-only";

import { unzipSync } from "fflate";
import { extractText, getDocumentProxy } from "unpdf";
import { FILE_BUCKET, filesSupabase } from "./class-files-server";

const MAX_EXTRACTED_CHARACTERS = 300000;
const decoder = new TextDecoder("utf-8");

function decodeXml(value) {
  return String(value || "")
    .replace(/<w:tab\s*\/>/gi, "\t")
    .replace(/<w:br\s*\/>|<a:br\s*\/>/gi, "\n")
    .replace(/<\/w:p>|<\/a:p>|<\/row>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);
}

function textFromOfficeZip(bytes, kind) {
  const files = unzipSync(bytes);
  let names = [];
  if (kind === "docx") {
    names = ["word/document.xml"];
  } else if (kind === "pptx") {
    names = Object.keys(files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } else if (kind === "xlsx") {
    names = Object.keys(files)
      .filter((name) => name === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }
  return normalizeText(
    names
      .filter((name) => files[name])
      .map((name) => decodeXml(decoder.decode(files[name])))
      .join("\n\n"),
  );
}

export async function extractMaterialText(bytes, mimeType, fileName) {
  const extension = String(fileName || "").split(".").pop()?.toLowerCase();
  if (mimeType === "text/plain" || extension === "txt") {
    return normalizeText(decoder.decode(bytes));
  }
  if (mimeType === "application/pdf" || extension === "pdf") {
    const pdf = await getDocumentProxy(bytes);
    if (pdf.numPages > 300) throw new Error("PDFs are limited to 300 pages for AI preparation.");
    const result = await extractText(pdf, { mergePages: true });
    return normalizeText(result.text);
  }
  if (extension === "docx" || extension === "pptx" || extension === "xlsx") {
    return textFromOfficeZip(bytes, extension);
  }
  return "";
}

export async function processMaterialForAi(material) {
  if (!filesSupabase) return { status: "failed", error: "File storage is not configured." };
  try {
    const { data: blob, error: downloadError } = await filesSupabase.storage
      .from(FILE_BUCKET)
      .download(material.storage_path);
    if (downloadError || !blob) throw new Error("The source file could not be downloaded.");
    const text = await extractMaterialText(
      new Uint8Array(await blob.arrayBuffer()),
      material.mime_type,
      material.file_name,
    );
    const status = text ? "ready" : "unsupported";
    const error = text
      ? null
      : "This file has no readable text or its older file format is not supported for AI yet.";
    const { error: updateError } = await filesSupabase
      .from("course_materials")
      .update({
        ai_text: text || null,
        ai_status: status,
        ai_error: error,
        ai_processed_at: new Date().toISOString(),
      })
      .eq("id", material.id);
    if (updateError) throw updateError;
    return { status, characters: text.length, error };
  } catch (processingError) {
    await filesSupabase
      .from("course_materials")
      .update({
        ai_status: "failed",
        ai_error: processingError.message,
        ai_processed_at: new Date().toISOString(),
      })
      .eq("id", material.id);
    return { status: "failed", error: processingError.message };
  }
}
