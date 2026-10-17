import{NextResponse}from"next/server";import{apiStaff}from"@/lib/api-auth";
export async function PATCH(){const a=await apiStaff(true);return a.response??NextResponse.json({error:"Use the case workflow and Service Associate controls. Legacy free-text status/login assignment is retired."},{status:409});}
