import { cn } from '@/lib/utils'

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
}

export function Logo({ className, size = 'md', showText = true, ...props }: LogoProps) {
  const sizeClasses = {
    sm: 'h-10',
    md: 'h-16',
    lg: 'h-24',
    xl: 'h-32',
  }

  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      <img
        src="/oklut-logo.png"
        alt="OKLUT Logo"
        className={cn('object-contain', sizeClasses[size])}
      />
    </div>
  )
}
