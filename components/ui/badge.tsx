import type { HTMLAttributes } from "react";
type BadgeTone = "default" | "accent" | "teal" | "yellow" | "dark";
export function Badge({ tone = "default", className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) { return <span className={`nb-badge nb-badge-${tone} ${className}`.trim()} {...props} />; }
