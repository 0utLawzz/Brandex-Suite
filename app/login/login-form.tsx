"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: String(form.get("email")).trim(), password: String(form.get("password")) });
      if (signInError || !data.user) throw new Error("Sign-in failed. Check your email and password.");
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (!profile || !["admin", "viewer"].includes(profile.role)) {
        await supabase.auth.signOut();
        throw new Error("Your staff profile is unavailable. Contact the administrator.");
      }
      router.replace("/dashboard"); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to sign in. Try again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}><fieldset disabled={busy} className="form-grid"><div className="field full"><label htmlFor="email">EMAIL</label><Input id="email" name="email" type="email" autoComplete="username" required /></div><div className="field full"><label htmlFor="password">PASSWORD</label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div><div><Button type="submit" variant="accent">{busy ? "SIGNING IN…" : "SIGN IN"}</Button></div></fieldset>{error && <p role="alert" className="notice error">{error}</p>}</form>;
}
