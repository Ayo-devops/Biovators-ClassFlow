"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormPage from "../../../components/form-page";
import Icon from "../../../components/icon";
import { supabase } from "../../../lib/supabase";

export default function TeamAccessPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMembers = useCallback(async (token) => {
    const response = await fetch("/api/team", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load the team.");
    setMembers(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        if (!supabase) throw new Error("Sign-in is not configured.");
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          router.replace("/admin/login");
          return;
        }
        setAccessToken(data.session.access_token);
        await loadMembers(data.session.access_token);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [loadMembers, router]);

  async function revoke(member) {
    if (
      !window.confirm(
        `Revoke ${member.role === "admin" ? "administrator" : "course representative"} access for ${member.email}? Their account will remain, but they will immediately lose the workspace role.`,
      )
    ) {
      return;
    }
    setBusy(member.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/team", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: member.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not revoke access.");
      setMembers((current) => current.filter((item) => item.id !== member.id));
      setNotice(`Workspace access revoked for ${member.email}.`);
    } catch (revokeError) {
      setError(revokeError.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <FormPage
      title="Keep our workspace access intentional."
      description="Only the Super Admin can invite our teammates, review roles, or revoke workspace access."
      icon="shield"
      back="/admin"
    >
      <div className="section-heading">
        <div>
          <h2>Workspace team</h2>
          <p>Revoking a role does not delete the person’s account.</p>
        </div>
        <Link className="button primary" href="/admin/invite">
          <Icon name="plus" size={16} />
          Invite teammate
        </Link>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}
      {loading ? (
        <p role="status">Loading workspace members…</p>
      ) : members.length ? (
        <div className="admin-list">
          {members.map((member) => (
            <div className="admin-row" key={member.id}>
              <div>
                <h3>{member.email}</h3>
                <p>
                  {member.role === "admin"
                    ? "Administrator"
                    : "Course representative"}
                </p>
              </div>
              <button
                className="delete-button"
                disabled={Boolean(busy)}
                onClick={() => revoke(member)}
              >
                {busy === member.id ? "Revoking…" : "Revoke access"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name="users" size={28} />
          <h3>No invited teammates yet</h3>
          <p>The Super Admin account is protected separately.</p>
        </div>
      )}
    </FormPage>
  );
}
