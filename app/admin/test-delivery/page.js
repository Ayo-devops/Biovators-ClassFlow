"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FormPage, { Field } from "../../../components/form-page";
import Icon from "../../../components/icon";
import { supabase } from "../../../lib/supabase";

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
        `Send this private test assignment only to ${selectedStudent.student_name} by email and WhatsApp? It will not be saved or shown to the class.`,
      )
    ) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/test-assignment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw Error(payload.error || "Test delivery failed.");
      setResult(payload);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <FormPage
      title="Test the full delivery flow."
      description="Create a private test assignment for exactly one registered student. It goes to their email and WhatsApp only."
      icon="send"
      back="/admin"
    >
      <h2>One-student test</h2>
      <p>This test is not saved, published, or sent to the rest of the class.</p>
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
          {result.results.whatsapp} WhatsApp message sent. Nothing was saved.
          {result.results.failures.length > 0 &&
            ` ${result.results.failures.length} channel(s) failed.`}
        </div>
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
          <button className="button primary" disabled={sending || !students.length}>
            {sending ? "Sending privately…" : "Send private test"}
            <Icon name="send" size={17} />
          </button>
        </form>
      )}
    </FormPage>
  );
}
