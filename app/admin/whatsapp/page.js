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
  const [reviewing, setReviewing] = useState(false);
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

  function reviewMessage(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const group = groups.find((item) => item.id === groupId);
    if (!group) {
      setError("Choose a WhatsApp group first.");
      return;
    }
    setReviewing(true);
  }

  async function sendMessage() {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;
    setError("");
    setSuccess("");
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
      setReviewing(false);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <FormPage
      title="Reach Biovators on WhatsApp."
      description="Choose one of our WhatsApp groups, review the message, and send it from our connected ClassFlow bot."
      icon="users"
      back="/admin"
    >
      <h2>Send to a WhatsApp group</h2>
      <p>
        Administrators and course representatives can send here. We’ll always
        ask you to confirm the group before a message leaves ClassFlow.
      </p>

      {error && <div className="notice error" role="alert">{error}</div>}
      {success && <div className="notice success" role="status">{success}</div>}

      {loading ? (
        <p role="status">Connecting to the WhatsApp bot…</p>
      ) : groups.length ? (
        reviewing ? (
          <div className="message-review">
            <p className="eyebrow">FINAL CHECK</p>
            <h3>Send this message?</h3>
            <div className="review-destination"><Icon name="users" size={17} /><span><small>WhatsApp group</small><strong>{groups.find((item) => item.id === groupId)?.name}</strong></span></div>
            <div className="review-message"><small>Message</small><p>{message}</p></div>
            <p className="review-warning">Once confirmed, this message will immediately be sent to the selected group.</p>
            <div className="form-actions">
              <button type="button" className="button secondary" disabled={sending} onClick={() => setReviewing(false)}>Go back and edit</button>
              <button type="button" className="button primary" disabled={sending} onClick={sendMessage}>{sending ? "Sending…" : "Confirm and send"}<Icon name="send" size={16} /></button>
            </div>
          </div>
        ) : (
          <form onSubmit={reviewMessage}>
            <Field name="whatsapp_group" label="WhatsApp group" options={groups.map((group) => ({ value: group.id, label: group.name }))} value={groupId} onChange={(event) => setGroupId(event.target.value)} required />
            <Field name="whatsapp_message" label="Message" multiline required maxLength={4096} placeholder="Write the message our group should receive…" value={message} onChange={(event) => setMessage(event.target.value)} />
            <button className="button primary" disabled={!message.trim()}>Review message<Icon name="arrow" size={17} /></button>
          </form>
        )
      ) : (
        <div className="notice">
          Our bot is connected, but it is not currently a member of any WhatsApp groups.
        </div>
      )}
    </FormPage>
  );
}
