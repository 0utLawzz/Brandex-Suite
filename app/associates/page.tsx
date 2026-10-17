import {requireStaff} from "@/lib/auth";
import {Navbar} from "@/components/ui/navbar";
import AssociateAccounts from "@/components/associate-accounts";
export default async function Associates(){const {role}=await requireStaff();return <><Navbar role={role} current="associates"/><main className="phase-page"><div className="page-top"><div><p className="eyebrow">BRANDEX / Service Associates · PKR</p><h1>Assignments & settlements</h1><p>Internal contacts, earned assignment fees and payments. Separate from client stage charges.</p></div></div><AssociateAccounts canWrite={role==="admin"}/></main></>}
