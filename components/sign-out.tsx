"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <><button className="nav-sign-out" disabled={busy} onClick={async () => {
    setBusy(true); setError(false);
    try {
      const { error: failure } = await createClient().auth.signOut();
      if (failure) throw failure;
      router.replace("/login"); router.refresh();
    } catch { setError(true); } finally { setBusy(false); }
  }}>{busy ? "SIGNING OUT…" : "SIGN OUT"}</button>{error && <span role="alert">Sign-out failed. Try again.</span>}</>;
}
