import type { HTMLAttributes } from "react";
export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) { return <section className={`nb-card ${className}`.trim()} {...props} />; }
export function Panel({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`nb-panel ${className}`.trim()} {...props} />; }
