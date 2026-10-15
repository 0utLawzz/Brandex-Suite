import { requireStaff } from "@/lib/auth";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
import PasswordForm from "./password-form";

export default async function PasswordPage() {
  await requireStaff();
  return <><Navbar current="cases" /><main className="phase-page"><Card><p className="eyebrow">BRANDEX SUITE / ACCOUNT</p><h1>Choose your password</h1><PasswordForm /></Card></main></>;
}
