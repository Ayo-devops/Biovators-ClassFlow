"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import FormPage, { Field } from "./form-page";
import Icon from "./icon";
import { supabase } from "../lib/supabase";
const configs = {
  register: {
    title: "A little reminder. A lot less worry.",
    description:
      "Join our Biovators reminder list so we can stay ahead of every deadline together.",
    heading: "Stay in our loop",
    intro: "Add your details and we’ll keep you connected.",
    endpoint: "/api/students",
    button: "Register for reminders",
    icon: "bell",
    fields: [
      ["student_name", "Full name", "text", "e.g. Akorede Ayomide"],
      ["student_email", "Email address", "email", "you@example.com"],
      [
        "whatsapp_number",
        "WhatsApp number (optional)",
        "tel",
        "e.g. +2348012345678",
      ],
    ],
    success: "You’re on the list!",
    successBody:
      "You’re now part of our reminder list. Head back to see what’s coming up for us.",
  },
  submit: {
    title: "One assignment. All Biovators up to date.",
    description:
      "Share the details once so all of us have a clear picture of what’s next.",
    heading: "Assignment details",
    intro: "The essentials we need to get started.",
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
        "Anything else we should know?",
      ],
    ],
    success: "Assignment added",
    successBody: "The assignment is now on our Biovators dashboard.",
  },
  announce: {
    title: "Keep Biovators in the know.",
    description:
      "Whether it’s a change of plans or a quick heads-up, share it with all of us.",
    heading: "Write an announcement",
    intro: "A clear message makes all the difference.",
    endpoint: "/api/announcements",
    button: "Post announcement",
    icon: "bell",
    fields: [
      ["title", "Title", "text", "e.g. Tomorrow’s class has moved"],
      ["body", "Message", "textarea", "What do Biovators need to know?"],
      ["posted_by", "Posted by", "text", "Your name or course rep title"],
    ],
    success: "Announcement posted",
    successBody: "Your update is now on our Biovators noticeboard.",
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
    [success, setSuccess] = useState(false),
    [resultNotice, setResultNotice] = useState(""),
    [resultWarning, setResultWarning] = useState(false);
  const [accessToken, setAccessToken] = useState(""),
    [workspaceRole, setWorkspaceRole] = useState(""),
    [authChecking, setAuthChecking] = useState(kind !== "register"),
    [groups, setGroups] = useState([]),
    [whatsappGroupId, setWhatsappGroupId] = useState("");

  useEffect(() => {
    if (kind === "register") return;

    async function loadWorkspaceAccess() {
      if (!supabase) {
        setError("Sign-in is not configured yet.");
        setAuthChecking(false);
        return;
      }
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          setAuthChecking(false);
          return;
        }

        const token = data.session.access_token;
        setAccessToken(token);
        const membershipResponse = await fetch("/api/workspace/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const membership = await membershipResponse.json();
        if (!membershipResponse.ok) {
          throw new Error(
            membership.error || "Workspace access is required.",
          );
        }
        setWorkspaceRole(membership.role);

        if (kind === "announce") {
          const response = await fetch("/api/whatsapp/groups", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          const responseData = await response.json();
          if (!response.ok) {
            throw new Error(
              responseData.error || "Could not load WhatsApp groups.",
            );
          }
          setGroups(
            Array.isArray(responseData.groups) ? responseData.groups : [],
          );
        }
      } catch (accessError) {
        setError(accessError.message);
      } finally {
        setAuthChecking(false);
      }
    }

    loadWorkspaceAccess();
  }, [kind]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    if (kind === "announce" && whatsappGroupId) {
      const group = groups.find((item) => item.id === whatsappGroupId);
      if (!group) {
        setError("Choose an available WhatsApp group.");
        return;
      }
      if (
        !window.confirm(
          `Post this announcement and send it to “${group.name}” on WhatsApp?`,
        )
      ) {
        return;
      }
    }
    setLoading(true);
    setError("");
    setResultNotice("");
    setResultWarning(false);
    try {
      const r = await fetch(c.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          ...(kind === "announce"
            ? { whatsapp_group_id: whatsappGroupId }
            : {}),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw Error(
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "We couldn’t save this. Please try again.",
        );
      }
      if (kind === "announce") {
        if (data.warning) {
          setResultNotice(data.warning);
          setResultWarning(true);
        } else if (data.delivery?.whatsappSent) {
          setResultNotice(
            `The announcement was also sent to ${data.delivery.whatsappGroup} on WhatsApp.`,
          );
        } else {
          setResultNotice(
            "The announcement was posted without group delivery.",
          );
        }
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
      {kind !== "register" && authChecking ? (
        <p role="status">Checking workspace access…</p>
      ) : kind !== "register" && !accessToken ? (
        <div className="notice error" role="alert">
          Sign in to the admin workspace before publishing class content.{" "}
          <Link href="/admin/login">Sign in</Link>
        </div>
      ) : success ? (
        <div className="form-success" role="status">
          <span className="empty-icon">
            <Icon name="check" size={29} />
          </span>
          <h2>{c.success}</h2>
          <p>{c.successBody}</p>
          {resultNotice && (
            <div className={`notice ${resultWarning ? "error" : "success"}`}>
              {resultNotice}
            </div>
          )}
          <Link href="/" className="button primary">
            Back to overview <Icon name="arrow" size={17} />
          </Link>
          {kind !== "register" && (
            <button
              className="text-button"
              onClick={() => {
                setForm(initial);
                setWhatsappGroupId("");
                setResultNotice("");
                setResultWarning(false);
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
                required={name !== "description" && name !== "whatsapp_number"}
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
            {kind === "announce" && workspaceRole && (
              <Field
                name="whatsapp_group_id"
                label="WhatsApp group delivery (optional)"
                options={[
                  { value: "", label: "Noticeboard and email only" },
                  ...groups.map((group) => ({
                    value: group.id,
                    label: group.name,
                  })),
                ]}
                value={whatsappGroupId}
                onChange={(event) => setWhatsappGroupId(event.target.value)}
              />
            )}
            <button className="button primary" disabled={loading} type="submit">
              {loading ? "Saving…" : c.button}
              <Icon name="arrow" size={17} />
            </button>
          </form>
          <p className="form-caption">
            {kind === "register"
              ? "By registering, you agree to receive our Biovators assignment reminders."
              : "Double-check the details before sharing with all of us."}
          </p>
          {kind === "register" && (
            <div className="existing-registration">
              <span className="stat-icon">
                <Icon name="clock" size={17} />
              </span>
              <div>
                <strong>Already registered?</strong>
                <p>
                  Add a number you skipped earlier, or replace an old WhatsApp
                  number securely.
                </p>
              </div>
              <Link href="/update-phone" className="button secondary">
                Update number
              </Link>
            </div>
          )}
        </>
      )}
    </FormPage>
  );
}
