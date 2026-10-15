import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const query = await searchParams;
  const valid = typeof query.token_hash === "string" && /^[a-zA-Z0-9_-]{20,200}$/.test(query.token_hash) && ["recovery", "invite"].includes(query.type ?? "");
  return <><Navbar /><main className="phase-page"><Card><p className="eyebrow">BRANDEX SUITE / ACCOUNT</p><h1>Set up your login</h1><p className="muted">Continue to verify your private setup link, then choose your password.</p>{valid ? <form action="/api/auth/confirm" method="post"><input type="hidden" name="token_hash" value={query.token_hash} /><input type="hidden" name="type" value={query.type} /><Button type="submit" variant="accent">CONTINUE TO PASSWORD SETUP</Button></form> : <p role="alert">This setup link is invalid or expired. Ask your administrator for a fresh link.</p>}</Card></main></>;
}
