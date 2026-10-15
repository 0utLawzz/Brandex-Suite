import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
import LoginForm from "./login-form";

export default function LoginPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return <><Navbar /><main className="phase-page"><Card><p className="eyebrow">BRANDEX SUITE / STAFF</p><h1>Sign in</h1><p className="muted">Use your staff account. Access follows your assigned role.</p>{configured ? <LoginForm /> : <p role="alert">The workspace connection needs to be configured.</p>}</Card></main></>;
}
