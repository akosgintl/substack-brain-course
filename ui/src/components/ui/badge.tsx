import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'border-line bg-surface-2 text-fg-2',
        accent: 'border-accent/25 bg-accent-soft text-fg',
        outline: 'border-line-strong text-fg-2',
        good: 'border-good/25 bg-good/10 text-good-text',
        warning: 'border-warning/30 bg-warning/10 text-fg',
        critical: 'border-critical/30 bg-critical/10 text-critical',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
