"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FormPage, { Field } from "../../../components/form-page";
import FilePicker from "../../../components/file-picker";
import Icon from "../../../components/icon";
import { supabase } from "../../../lib/supabase";
import { uploadPrivateTestFile } from "../../../lib/upload-class-file";

const initialForm = {
  studentId: "",
  course_title: "",
  assignment_title: "",
  lecturer_name: "",
  deadline_date: "",
  submission_method: "LMS",
  priority: "Medium",
  description: "",
};

export default function TestDelivery() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        if (!supabase) throw Error("Sign-in is not configured yet.");
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          router.replace("/admin/login");
          return;
        }
        setAccessToken(data.session.access_token);
        const response = await fetch("/api/students", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          if ([401, 403].includes(response.status)) {
            router.replace("/admin");
            return;
          }
          throw Error(payload.error || "Could not load students.");
        }
        setStudents(payload);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.id) === form.studentId),
    [form.studentId, students],
  );

  function update(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function send(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!selectedStudent) {
      setError("Choose the student who should receive the test.");
      return;
    }
    if (!selectedStudent.student_email || !selectedStudent.phone_number) {
      setError(
        "Choose a student with both an email address and WhatsApp number.",
      );
      return;
    }
    if (
      !window.confirm(
        `Send this private test assignment only to ${selectedStudent.student_name} by email and WhatsApp? It will not be published or shown to Biovators.`,
      )
    ) {
      return;
    }

    setSending(true);
    let uploadedAttachment = null;
    try {
      uploadedAttachment = file
        ? await uploadPrivateTestFile({ file, accessToken })
        : null;
      const response = await fetch("/api/test-assignment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ...form, attachment: uploadedAttachment }),
      });
      const payload = await response.json();
      if (!response.ok) throw Error(payload.error || "Test delivery failed.");
      setResult(payload);
    } catch (sendError) {
      if (uploadedAttachment?.path) {
        await fetch("/api/test-assignment", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ path: uploadedAttachment.path }),
        }).catch(() => undefined);
      }
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  async function removeTestFile() {
    if (!result?.attachment?.path) return;
    setCleaning(true);
    setError("");
    try {
      const response = await fetch("/api/test-assignment", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ path: result.attachment.path }),
      });
      const payload = await response.json();
      if (!response.ok) throw Error(payload.error || "Could not remove the test attachment.");
      setResult((current) => ({ ...current, attachment: null, attachmentRemoved: true }));
      setFile(null);
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setCleaning(false);
    }
  }

  return (
    <FormPage
      title="Test our full delivery flow."
      description="Create a private test assignment for exactly one registered Biovator. It goes to their email and WhatsApp only."
      icon="send"
      back="/admin"
    >
      <h2>One-student test</h2>
      <p>This assignment is not published or sent to the rest of Biovators.</p>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {result && (
        <div
          className={`notice ${result.results.failures.length ? "error" : "success"}`}
          role="status"
        >
          Finished for {result.target.name}: {result.results.emails} email and{" "}
          {result.results.whatsapp} WhatsApp message sent. No assignment was published.
          {result.attachment && ` The private test attachment link is active for 24 hours.`}
          {result.attachmentRemoved && " The test attachment has been removed from storage."}
          {result.results.failures.length > 0 &&
            ` ${result.results.failures.length} channel(s) failed.`}
        </div>
      )}
      {result?.attachment && (
        <button type="button" className="button secondary" disabled={cleaning} onClick={removeTestFile}>
          {cleaning ? "Removing test file…" : "Remove test file after checking it"}
        </button>
      )}
      {loading ? (
        <p role="status">Loading registered students…</p>
      ) : (
        <form onSubmit={send}>
          <Field
            name="studentId"
            label="Test recipient"
            required
            options={[
              { value: "", label: "Choose one registered student" },
              ...students.map((student) => ({
                value: String(student.id),
                label: `${student.student_name} — ${
                  student.student_email && student.phone_number
                    ? "email + WhatsApp ready"
                    : "missing a delivery channel"
                }`,
              })),
            ]}
            value={form.studentId}
            onChange={update}
          />
          <div className="field-row">
            <Field
              name="course_title"
              label="Course title"
              required
              value={form.course_title}
              onChange={update}
            />
            <Field
              name="assignment_title"
              label="Assignment title"
              required
              value={form.assignment_title}
              onChange={update}
            />
          </div>
          <div className="field-row">
            <Field
              name="lecturer_name"
              label="Lecturer"
              required
              value={form.lecturer_name}
              onChange={update}
            />
            <Field
              name="deadline_date"
              label="Deadline"
              type="date"
              required
              value={form.deadline_date}
              onChange={update}
            />
          </div>
          <div className="field-row">
            <Field
              name="submission_method"
              label="Submission method"
              required
              value={form.submission_method}
              onChange={update}
            />
            <Field
              name="priority"
              label="Priority"
              options={["Low", "Medium", "High"]}
              value={form.priority}
              onChange={update}
            />
          </div>
          <Field
            name="description"
            label="Description (optional)"
            multiline
            value={form.description}
            onChange={update}
          />
          <div className="field">
            <span>Test attachment (optional)</span>
            <FilePicker
              id="test_assignment_file"
              files={file ? [file] : []}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <span className="field-help">Choose one small file. Its private download link will work for 24 hours.</span>
          </div>
          <button className="button primary" disabled={sending || !students.length}>
            {sending ? "Sending privately…" : "Send private test"}
            <Icon name="send" size={17} />
          </button>
        </form>
      )}
    </FormPage>
  );
}
