"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import FormPage, { Field } from "../../../components/form-page";
import Icon from "../../../components/icon";
export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function login(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!supabase)
        throw Error(
          "Sign-in is not configured yet. Please contact your class administrator.",
        );
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.replace("/admin");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }
  return (
    <FormPage
      title="Welcome back, class leader."
      description="A little behind-the-scenes care keeps the whole class moving. Sign in to your workspace."
      icon="shield"
    >
      <h2>Sign in to ClassFlow</h2>
      <p>For admins and course representatives.</p>
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      <form onSubmit={login}>
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="button primary" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
          <Icon name="arrow" size={17} />
        </button>
      </form>
      <p className="form-caption">
        Use the account provided by your class administrator.
      </p>
    </FormPage>
  );
}
