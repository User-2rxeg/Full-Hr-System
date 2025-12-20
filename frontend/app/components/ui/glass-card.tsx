import * as React from "react"
import { cn } from "@/app/lib/utils"

const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    variant?: "default" | "hover" | "strong" 
  }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-background/60 backdrop-blur-md shadow-sm transition-all duration-300",
      variant === "default" && "border-white/10 dark:border-white/5",
      variant === "strong" && "bg-background/80 backdrop-blur-lg border-white/20 dark:border-white/10 shadow-lg",
      variant === "hover" && "hover:bg-background/80 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20",
      className
    )}
    {...props}
  />
))
GlassCard.displayName = "GlassCard"

export { GlassCard }
