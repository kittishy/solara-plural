import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-ios-blue/12 text-ios-blue text-caption-1 px-2.5 py-0.5",
        secondary:
          "bg-secondary text-secondary-foreground text-caption-1 px-2.5 py-0.5",
        destructive:
          "bg-ios-red/12 text-ios-red text-caption-1 px-2.5 py-0.5",
        success:
          "bg-ios-green/12 text-ios-green text-caption-1 px-2.5 py-0.5",
        outline:
          "border border-border text-foreground text-caption-1 px-2.5 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
