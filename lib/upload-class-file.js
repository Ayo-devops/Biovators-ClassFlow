import { supabase } from "./supabase";

export async function uploadClassFile({ file, accessToken, kind, assignmentId, courseCode, record }) {
  if (!supabase) throw new Error("File storage is not configured.");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };
  const prepareResponse = await fetch("/api/files/prepare", {
    method: "POST",
    headers,
    body: JSON.stringify({
      kind,
      assignmentId,
      courseCode,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });
  const prepared = await prepareResponse.json();
  if (!prepareResponse.ok) throw new Error(prepared.error || "Could not prepare the upload.");

  const { error: uploadError } = await supabase.storage
    .from("classflow-files")
    .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const endpoint = kind === "assignment" ? "/api/assignment-files" : "/api/materials";
  const completeResponse = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...record,
      assignmentId,
      path: prepared.path,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });
  const completed = await completeResponse.json();
  if (!completeResponse.ok) throw new Error(completed.error || "Could not finish the upload.");
  return completed;
}

export async function uploadPrivateTestFile({ file, accessToken }) {
  if (!supabase) throw new Error("File storage is not configured.");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };
  const prepareResponse = await fetch("/api/files/prepare", {
    method: "POST",
    headers,
    body: JSON.stringify({
      kind: "test-assignment",
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });
  const prepared = await prepareResponse.json();
  if (!prepareResponse.ok) throw new Error(prepared.error || "Could not prepare the test attachment.");

  const { error: uploadError } = await supabase.storage
    .from("classflow-files")
    .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  return {
    path: prepared.path,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  };
}
