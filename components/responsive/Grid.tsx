import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface GridProps {
  children: ReactNode
  className?: string
  cols?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
}

export function Grid({ children, className, cols = {}, gap = 4 }: GridProps) {
  const { xs = 1, sm, md, lg, xl } = cols;

  const getGridColsClass = () => {
    const classes = [`grid-cols-${xs}`];
    
    if (sm) classes.push(`sm:grid-cols-${sm}`);
    if (md) classes.push(`md:grid-cols-${md}`);
    if (lg) classes.push(`lg:grid-cols-${lg}`);
    if (xl) classes.push(`xl:grid-cols-${xl}`);
    
    return classes.join(' ');
  };

  const getGapClass = () => {
    return `gap-${gap}`;
  };

  return (
    <div
      className={cn(
        'grid',
        getGridColsClass(),
        getGapClass(),
        className
      )}
    >
      {children}
    </div>
  )
} 