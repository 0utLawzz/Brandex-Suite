import { requireStaff } from "@/lib/auth";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
import PasswordForm from "./password-form";

export default async function PasswordPage() {
  const { role } = await requireStaff();
  return <><Navbar current="cases" role={role} /><main className="phase-page"><Card><p className="eyebrow">BRANDEX SUITE / ACCOUNT</p><h1>Choose your password</h1><PasswordForm /></Card></main></>;
}
