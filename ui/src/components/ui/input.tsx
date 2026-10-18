import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm text-fg placeholder:text-muted transition-colors outline-none hover:border-line-strong focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(field, 'h-10', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(field, 'resize-none py-3 leading-relaxed', className)} {...props} />
}
