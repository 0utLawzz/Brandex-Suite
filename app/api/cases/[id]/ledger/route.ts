import {NextResponse} from "next/server";import{apiStaff}from"@/lib/api-auth";
async function retired(){const a=await apiStaff(true);return a.response??NextResponse.json({error:"Legacy paid/pending entries are preserved read-only. Use Client Ledger for charges, receiving and allocations."},{status:409});}
export const POST=retired;export const PATCH=retired;export const DELETE=retired;
