import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface StackProps {
  children: ReactNode
  className?: string
  direction?: {
    xs?: 'row' | 'col'
    sm?: 'row' | 'col'
    md?: 'row' | 'col'
    lg?: 'row' | 'col'
    xl?: 'row' | 'col'
  }
  gap?: number
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
}

export function Stack({
  children,
  className,
  direction = {},
  gap = 4,
  align = 'start',
  justify = 'start',
}: StackProps) {
  const directionClasses = {
    xs: `flex-${direction.xs || 'col'}`,
    sm: direction.sm ? `sm:flex-${direction.sm}` : '',
    md: direction.md ? `md:flex-${direction.md}` : '',
    lg: direction.lg ? `lg:flex-${direction.lg}` : '',
    xl: direction.xl ? `xl:flex-${direction.xl}` : '',
  }

  return (
    <div
      className={cn(
        'flex',
        directionClasses.xs,
        directionClasses.sm,
        directionClasses.md,
        directionClasses.lg,
        directionClasses.xl,
        `gap-${gap}`,
        `items-${align}`,
        `justify-${justify}`,
        className
      )}
    >
      {children}
    </div>
  )
} 