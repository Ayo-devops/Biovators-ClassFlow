"use client";

import { useEffect, useState } from "react";
import FormPage, { Field } from "../../components/form-page";
import Icon from "../../components/icon";
import { supabase } from "../../lib/supabase";

export default function UpdatePhonePage() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(supabase));
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(
    supabase ? "" : "Student verification is not configured yet.",
  );

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function requestLink(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const { error: linkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/update-phone`,
      },
    });

    if (linkError) setError(linkError.message);
    else setLinkSent(true);
    setBusy(false);
  }

  async function updatePhone(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const response = await fetch("/api/students/phone", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ phone_number: phone }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) setError(data.error || "The number could not be updated.");
    else setSuccess(true);
    setBusy(false);
  }

  return (
    <FormPage
      title="Keep your reminders within reach."
      description="Verify your email, then add or replace the WhatsApp number on your registration."
      icon="clock"
      back="/register"
    >
      {checkingSession ? (
        <p role="status">Checking your verification…</p>
      ) : success ? (
        <div className="form-success" role="status">
          <span className="empty-icon">
            <Icon name="check" size={29} />
          </span>
          <h2>WhatsApp number updated</h2>
          <p>Future ClassFlow reminders will use your new number.</p>
        </div>
      ) : session ? (
        <>
          <h2>Update WhatsApp number</h2>
          <p>Your email has been verified. Enter the number you want to use.</p>
          {error && <div className="notice error" role="alert">{error}</div>}
          <form onSubmit={updatePhone}>
            <Field
              name="phone_number"
              label="WhatsApp number"
              type="tel"
              autoComplete="tel"
              placeholder="e.g. +2348012345678"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <button className="button primary" disabled={busy} type="submit">
              {busy ? "Updating…" : "Update number"}
              <Icon name="arrow" size={17} />
            </button>
          </form>
        </>
      ) : linkSent ? (
        <div className="form-success" role="status">
          <span className="empty-icon">
            <Icon name="check" size={29} />
          </span>
          <h2>Check your email</h2>
          <p>Open the verification link, then return here to update your number.</p>
        </div>
      ) : (
        <>
          <h2>Verify your registration email</h2>
          <p>We’ll email you a secure sign-in link before changing your number.</p>
          {error && <div className="notice error" role="alert">{error}</div>}
          <form onSubmit={requestLink}>
            <Field
              name="email"
              label="Registration email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button className="button primary" disabled={busy} type="submit">
              {busy ? "Sending…" : "Send verification link"}
              <Icon name="arrow" size={17} />
            </button>
          </form>
        </>
      )}
    </FormPage>
  );
}
