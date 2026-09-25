"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import FormPage, { Field } from "../../../components/form-page";
import Icon from "../../../components/icon";
export default function Invite() {
  const router = useRouter();
  const [role, setRole] = useState(null),
    [accessToken, setAccessToken] = useState(""),
    [email, setEmail] = useState(""),
    [inviteRole, setInviteRole] = useState("rep"),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    async function auth() {
      if (!supabase) {
        setError("Sign-in is not configured yet.");
        return;
      }
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session) {
          router.replace("/admin/login");
          return;
        }
        setAccessToken(session.access_token);
        const response = await fetch("/api/invite", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          if ([401, 403].includes(response.status)) {
            setRole("rep");
            return;
          }
          throw new Error(
            data.error || "Could not verify administrator access.",
          );
        }
        setRole(data.role);
      } catch (e) {
        setError(e.message);
      }
    }
    auth();
  }, [router]);
  async function invite(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const r = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = await r.json();
      if (!r.ok)
        throw Error(
          typeof data.error === "string"
            ? data.error
            : "Could not send the invite.",
        );
      setSuccess(data.message || "Invitation sent successfully.");
      setEmail("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <FormPage
      title="Good classes take a team."
      description="Invite a course representative or another admin to help keep things running smoothly."
      icon="users"
      back="/admin"
    >
      <h2>Invite a teammate</h2>
      <p>They’ll receive an email with their next steps.</p>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="notice success" role="status">
          {success}
        </div>
      )}
      {!role && !error ? (
        <p role="status">Checking access…</p>
      ) : role === "admin" ? (
        <form onSubmit={invite}>
          <Field
            name="invite_email"
            label="Email address"
            type="email"
            required
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            name="invite_role"
            label="Workspace role"
            options={[
              { value: "rep", label: "Course representative" },
              { value: "admin", label: "Administrator" },
            ]}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          />
          <button className="button primary" disabled={loading}>
            {loading ? "Sending…" : "Send invitation"}
            <Icon name="arrow" size={17} />
          </button>
        </form>
      ) : (
        role && (
          <div className="notice error">
            Only administrators can invite teammates.
          </div>
        )
      )}
    </FormPage>
  );
}
