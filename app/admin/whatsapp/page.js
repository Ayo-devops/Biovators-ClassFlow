"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormPage, { Field } from "../../../components/form-page";
import Icon from "../../../components/icon";
import { supabase } from "../../../lib/supabase";

export default function WhatsAppAdminPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadGroups = useCallback(async (token) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/whatsapp/groups", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load WhatsApp groups.");
      const nextGroups = Array.isArray(data.groups) ? data.groups : [];
      setGroups(nextGroups);
      setGroupId((current) => current || nextGroups[0]?.id || "");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function authenticate() {
      if (!supabase) {
        setError("Sign-in is not configured yet.");
        setLoading(false);
        return;
      }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }
      if (!data.session) {
        router.replace("/admin/login");
        return;
      }
      setAccessToken(data.session.access_token);
      await loadGroups(data.session.access_token);
    }
    authenticate();
  }, [loadGroups, router]);

  async function sendMessage(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const group = groups.find((item) => item.id === groupId);
    if (!group) {
      setError("Choose a WhatsApp group first.");
      return;
    }
    if (!window.confirm(`Send this message to “${group.name}”?`)) return;

    setSending(true);
    try {
      const response = await fetch("/api/whatsapp/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ groupId, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send the message.");
      setSuccess(`Message sent to ${group.name}.`);
      setMessage("");
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <FormPage
      title="Reach the whole class on WhatsApp."
      description="Choose a WhatsApp group, review your announcement, and send it from the connected ClassFlow bot."
      icon="users"
      back="/admin"
    >
      <h2>Send to a WhatsApp group</h2>
      <p>Only administrators can access this page. You will confirm every message before it is sent.</p>

      {error && <div className="notice error" role="alert">{error}</div>}
      {success && <div className="notice success" role="status">{success}</div>}

      {loading ? (
        <p role="status">Connecting to the WhatsApp bot…</p>
      ) : groups.length ? (
        <form onSubmit={sendMessage}>
          <Field
            name="whatsapp_group"
            label="WhatsApp group"
            options={groups.map((group) => ({ value: group.id, label: group.name }))}
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            required
          />
          <Field
            name="whatsapp_message"
            label="Message"
            multiline
            required
            maxLength={4096}
            placeholder="Write the message your group should receive…"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <button className="button primary" disabled={sending || !message.trim()}>
            {sending ? "Sending…" : "Review and send"}
            <Icon name="arrow" size={17} />
          </button>
        </form>
      ) : (
        <div className="notice">
          The bot is connected, but it is not currently a member of any WhatsApp groups.
        </div>
      )}
    </FormPage>
  );
}
