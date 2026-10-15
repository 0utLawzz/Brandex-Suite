"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PasswordForm() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const password = String(data.get("password")); if (password !== data.get("confirm")) { setError("Passwords do not match."); return; }
    setBusy(true); setError("");
    try { const { error: failure } = await createClient().auth.updateUser({ password }); if (failure) throw failure; router.replace("/dashboard"); router.refresh(); }
    catch { setError("Could not save the password. Use at least 12 characters and try again, or request a fresh setup link."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}><fieldset disabled={busy} className="form-grid"><div className="field full"><label htmlFor="new-password">NEW PASSWORD</label><Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} required /></div><div className="field full"><label htmlFor="confirm-password">CONFIRM PASSWORD</label><Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength={12} required /></div><div><Button type="submit" variant="accent">{busy ? "SAVING…" : "SAVE PASSWORD"}</Button></div></fieldset>{error && <p role="alert" className="notice error">{error}</p>}</form>;
}
