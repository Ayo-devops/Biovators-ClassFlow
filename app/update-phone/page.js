"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
      title="Changed your number? Keep ClassFlow with you."
      description="Add or replace the WhatsApp number connected to your reminder registration—without registering again."
      icon="bell"
      back="/register"
      backLabel="reminder registration"
    >
      {checkingSession ? (
        <p role="status">Checking your verification…</p>
      ) : success ? (
        <div className="form-success" role="status">
          <span className="empty-icon">
            <Icon name="check" size={29} />
          </span>
          <h2>WhatsApp number updated</h2>
          <p>
            You’re all set. Future ClassFlow reminders will use your new
            number.
          </p>
          <Link className="button secondary" href="/">
            Return to ClassFlow
          </Link>
        </div>
      ) : session ? (
        <>
          <p className="step-label">STEP 3 OF 3</p>
          <h2>Add your current WhatsApp number</h2>
          <p>
            Your email is verified. Enter the phone number where you want to
            receive future reminders.
          </p>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={updatePhone}>
            <Field
              name="phone_number"
              label="WhatsApp or phone number"
              type="tel"
              autoComplete="tel"
              placeholder="e.g. 08012345678 or +2348012345678"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <button className="button primary" disabled={busy} type="submit">
              {busy ? "Updating…" : "Update number"}
              <Icon name="arrow" size={17} />
            </button>
            <p className="field-help">
              Nigerian numbers beginning with 0 are converted to the +234
              format automatically.
            </p>
          </form>
        </>
      ) : linkSent ? (
        <div className="form-success" role="status">
          <span className="empty-icon">
            <Icon name="check" size={29} />
          </span>
          <h2>Check your email</h2>
          <p>
            We sent a secure sign-in link to <strong>{email}</strong>. Open it
            on this device to continue. The link confirms that the registration
            belongs to you.
          </p>
        </div>
      ) : (
        <>
          <p className="step-label">STEP 1 OF 3</p>
          <h2>Verify your registration email</h2>
          <p>
            Use the same email address you originally registered with. We’ll
            send a secure link before allowing any number to be changed.
          </p>
          <div className="update-phone-guide" aria-label="How updating works">
            <h3>How it works</h3>
            <ol>
              <li>Enter your registered email address.</li>
              <li>Open the private verification link we send you.</li>
              <li>Add your current WhatsApp or phone number.</li>
            </ol>
            <p>
              This updates only your reminder number. Your name, email, and
              existing registration stay the same.
            </p>
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
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
              {busy ? "Sending…" : "Email me a secure link"}
              <Icon name="arrow" size={17} />
            </button>
          </form>
        </>
      )}
    </FormPage>
  );
}
