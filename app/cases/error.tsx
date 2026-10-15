"use client";
import { Button } from "@/components/ui/button";
export default function CaseError({ reset }: { reset: () => void }) {
  return <main className="phase-page"><h1>Unable to load workspace</h1><p role="alert">Your case data could not be loaded. Please try again.</p><Button onClick={reset}>TRY AGAIN</Button></main>;
}
