import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brandex Suite",
  description: "Case processing, ledger, and document generation in one workspace.",
  themeColor: "#27105F",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="theme-neobrutalism">{children}<footer className="workspace-footer no-print"><a href="/">BRANDEX LAW ASSOCIATES</a><span>SUITE · CASES / CLIENT LEDGER / DOCUMENTS</span><span>KEEPING THE LEGACY ALIVE</span></footer></body></html>;
}
