import { Package, ShoppingCart, Users, FileText, Search, Inbox } from 'lucide-react'
import Button from './Button'

const EmptyState = ({ 
  icon: Icon = Inbox, 
  title, 
  description, 
  actionLabel, 
  onAction,
  size = 'md'
}) => {
  const iconSizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className={`
        ${iconSizes[size]} 
        rounded-full 
        bg-gradient-to-br from-slate-100 to-slate-200 
        flex items-center justify-center 
        mb-4
        animate-slide-up
      `}>
        <Icon className={`${size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10'} text-slate-400`} />
      </div>
      
      {title && (
        <h3 className="text-lg font-semibold text-slate-900 mb-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {title}
        </h3>
      )}
      
      {description && (
        <p className="text-sm text-slate-500 max-w-md mb-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          {description}
        </p>
      )}
      
      {actionLabel && onAction && (
        <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          <Button onClick={onAction} variant="primary">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

export default EmptyState

