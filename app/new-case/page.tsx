import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { Navbar } from "@/components/ui/navbar";
import CaseRegistration from "@/app/intake/intake-form";
export default async function NewCase() {
  const { role } = await requireStaff();
  if (role !== "admin") redirect("/cases");
  return (
    <>
      <Navbar role={role} current="intake" />
      <CaseRegistration />
    </>
  );
}
