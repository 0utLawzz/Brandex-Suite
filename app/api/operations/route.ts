import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/api-auth";
const actions=new Set(["series","client","associate","receiving","void_receiving","settlement","void_settlement","identity","prepare_stage","charge","assign","hearing","delivery","event"]);
export async function POST(request:Request){
 const auth=await apiStaff(true);if(auth.response)return auth.response;
 const body=await request.json().catch(()=>null);
 if(!body||!actions.has(body.action)||!body.data||Array.isArray(body.data)||typeof body.data!=="object")return NextResponse.json({error:"Invalid action"},{status:400});
 const {data,error}=await auth.supabase.rpc("suite_action",{p_action:body.action,p_data:body.data});
 if(error)return NextResponse.json({error:error.message},{status:/changed|reload/i.test(error.message)?409:400});
 return NextResponse.json(data);
}
