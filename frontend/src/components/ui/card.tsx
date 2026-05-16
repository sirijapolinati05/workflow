import { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("glass-panel rounded-3xl p-5", className)}>{children}</div>;
}

