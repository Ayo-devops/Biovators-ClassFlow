"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormPage, { Field } from "../../../components/form-page";
import Icon from "../../../components/icon";
import { supabase } from "../../../lib/supabase";

export default function SetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setError("Workspace authentication is not configured.");
      setChecking(false);
      return undefined;
    }

    let active = true;
    async function verifyInvitation() {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const tokenHash = fragment.get("token_hash");
      const type = fragment.get("type");
      let session = null;
      let sessionError = null;

      if (tokenHash && ["invite", "recovery"].includes(type)) {
        const result = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        session = result.data.session;
        sessionError = result.error;
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        const result = await supabase.auth.getSession();
        session = result.data.session;
        sessionError = result.error;
      }

      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setReady(Boolean(session));
      setChecking(false);
    }
    verifyInvitation();

    return () => {
      active = false;
    };
  }, []);

  async function savePassword(event) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      router.replace("/admin");
    } catch (updateError) {
      setError(updateError.message);
      setLoading(false);
    }
  }

  return (
    <FormPage
      title="Join the Biovators workspace."
      description="Choose the password you’ll use to help manage our collective on ClassFlow."
      icon="shield"
      back="/admin/login"
      backLabel="sign in"
    >
      <h2>Set your workspace password</h2>
      <p>Your invitation securely determines your workspace role.</p>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {checking ? (
        <p role="status">Verifying your invitation…</p>
      ) : ready ? (
        <form onSubmit={savePassword}>
          <Field
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Field
            label="Confirm new password"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
          />
          <button className="button primary" disabled={loading}>
            {loading ? "Saving password…" : "Set password and continue"}
            <Icon name="arrow" size={17} />
          </button>
        </form>
      ) : (
        <div className="notice error" role="alert">
          This invitation link is invalid or has expired. Ask a ClassFlow
          administrator to send a new invitation.
        </div>
      )}
    </FormPage>
  );
}
