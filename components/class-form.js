"use client";
import { useState } from "react";
import Link from "next/link";
import FormPage, { Field } from "./form-page";
import Icon from "./icon";
const configs = {
  register: {
    title: "A little reminder. A lot less worry.",
    description:
      "Join your class reminder list and keep upcoming deadlines on your radar.",
    heading: "Stay in the loop",
    intro: "Your details, and you’re good to go.",
    endpoint: "/api/students",
    button: "Register for reminders",
    icon: "bell",
    fields: [
      ["student_name", "Full name", "text", "e.g. Akorede Ayomide"],
      ["student_email", "Email address", "email", "you@example.com"],
      ["whatsapp_number", "WhatsApp number", "tel", "e.g. 08012345678"],
    ],
    success: "You’re on the list!",
    successBody:
      "Your reminder registration has been saved. Head back to see what’s coming up.",
  },
  submit: {
    title: "One assignment. Everyone up to date.",
    description:
      "Share the details once. Give your classmates a clear picture of what’s next.",
    heading: "Assignment details",
    intro: "The essentials your class needs to get started.",
    endpoint: "/api/assignments",
    button: "Add assignment",
    icon: "book",
    fields: [
      ["course_title", "Course title", "text", "e.g. Engineering Mathematics"],
      [
        "assignment_title",
        "Assignment title",
        "text",
        "e.g. Integration Problems",
      ],
      ["lecturer_name", "Lecturer", "text", "e.g. Engr. Alao"],
      ["deadline_date", "Deadline", "date"],
      [
        "submission_method",
        "Submission method",
        ["Email", "LMS", "Physical", "Other"],
      ],
      ["priority", "Priority", ["Medium", "Low", "High"]],
      [
        "description",
        "Additional instructions",
        "textarea",
        "Anything else the class should know?",
      ],
    ],
    success: "Assignment added",
    successBody: "The assignment is now on your class dashboard.",
  },
  announce: {
    title: "Keep everyone in the know.",
    description:
      "A change of plans, an important update, or a quick heads-up. Share it with your class.",
    heading: "Write an announcement",
    intro: "A clear message makes all the difference.",
    endpoint: "/api/announcements",
    button: "Post announcement",
    icon: "bell",
    fields: [
      ["title", "Title", "text", "e.g. Tomorrow’s class has moved"],
      ["body", "Message", "textarea", "What does your class need to know?"],
      ["posted_by", "Posted by", "text", "Your name or course rep title"],
    ],
    success: "Announcement posted",
    successBody: "Your update is now on the class noticeboard.",
  },
};
export default function ClassForm({ kind }) {
  const c = configs[kind];
  const initial = Object.fromEntries(
    c.fields.map(([name, , type]) => [
      name,
      Array.isArray(type) ? type[0] : "",
    ]),
  );
  const [form, setForm] = useState(initial),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false);
  const [unlocked, setUnlocked] = useState(kind === "register"),
    [password, setPassword] = useState("");
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch(c.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw Error(
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "We couldn’t save this. Please try again.",
        );
      }
      setSuccess(true);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "You appear to be offline. Reconnect and try again."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <FormPage title={c.title} description={c.description} icon={c.icon}>
      {!unlocked ? (
        <>
          <h2>Course rep access</h2>
          <p>Enter your class access password to continue.</p>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password === "classflow2026") {
                setUnlocked(true);
                setError("");
              } else setError("That password doesn’t match. Please try again.");
            }}
          >
            <Field
              name="access_password"
              label="Class password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="button primary" type="submit">
              Continue <Icon name="arrow" size={17} />
            </button>
          </form>
        </>
      ) : success ? (
        <div className="form-success" role="status">
          <span className="empty-icon">
            <Icon name="check" size={29} />
          </span>
          <h2>{c.success}</h2>
          <p>{c.successBody}</p>
          <Link href="/" className="button primary">
            Back to overview <Icon name="arrow" size={17} />
          </Link>
          {kind !== "register" && (
            <button
              className="text-button"
              onClick={() => {
                setForm(initial);
                setSuccess(false);
              }}
            >
              Add another
            </button>
          )}
        </div>
      ) : (
        <>
          <h2>{c.heading}</h2>
          <p>{c.intro}</p>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            {c.fields.map(([name, label, type, placeholder]) => (
              <Field
                key={name}
                name={name}
                label={label}
                type={
                  typeof type === "string" && type !== "textarea"
                    ? type
                    : undefined
                }
                options={Array.isArray(type) ? type : undefined}
                multiline={type === "textarea"}
                placeholder={placeholder}
                required={name !== "description"}
                value={form[name]}
                onChange={change}
                autoComplete={
                  name === "student_name"
                    ? "name"
                    : name === "student_email"
                      ? "email"
                      : name === "whatsapp_number"
                        ? "tel"
                        : undefined
                }
              />
            ))}
            <button className="button primary" disabled={loading} type="submit">
              {loading ? "Saving…" : c.button}
              <Icon name="arrow" size={17} />
            </button>
          </form>
          <p className="form-caption">
            {kind === "register"
              ? "By registering, you agree to receive class assignment reminders."
              : "Double-check your details before sharing with the class."}
          </p>
        </>
      )}
    </FormPage>
  );
}
