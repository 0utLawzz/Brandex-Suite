import type { ButtonHTMLAttributes } from "react";
type ButtonVariant = "default" | "accent" | "teal" | "yellow" | "dark" | "ghost";
export function Button({ className = "", variant = "default", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={`nb-button nb-button-${variant} ${className}`.trim()} {...props} />;
}
