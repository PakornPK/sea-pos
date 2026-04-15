import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-[20px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 text-[11px] font-medium whitespace-nowrap transition-all [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // iOS Blue
        default:
          "bg-primary/10 text-primary",
        // Neutral gray
        secondary:
          "bg-secondary text-secondary-foreground",
        // iOS Red
        destructive:
          "bg-destructive/10 text-destructive",
        // Border only — for subtle labels
        outline:
          "border-border text-muted-foreground",
        // iOS Green — stock OK, success
        success:
          "bg-[oklch(0.719_0.188_145)]/15 text-[oklch(0.579_0.188_145)]",
        // iOS Orange — low stock, warning
        warning:
          "bg-[oklch(0.704_0.170_65)]/15 text-[oklch(0.574_0.170_65)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
