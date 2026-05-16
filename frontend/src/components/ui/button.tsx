import { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline";
};

export function Button({ className, variant = "solid", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
        variant === "outline"
          ? "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
          : "bg-primary-600 text-white hover:bg-primary-700",
        className,
      )}
      {...props}
    />
  );
}
