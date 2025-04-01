import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
  fluid?: boolean
}

export function Container({ children, className, fluid = false }: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        {
          'px-4 sm:px-6 lg:px-8': !fluid,
          'max-w-7xl': !fluid,
        },
        className
      )}
    >
      {children}
    </div>
  )
} 