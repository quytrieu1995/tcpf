import { forwardRef } from 'react'

const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  className = '',
  ...props 
}, ref) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40',
    secondary: 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-900 hover:from-slate-200 hover:to-slate-300 shadow-md hover:shadow-lg border border-slate-200',
    danger: 'bg-gradient-to-r from-red-500 via-red-500 to-rose-600 text-white hover:from-red-600 hover:via-red-600 hover:to-rose-700 shadow-lg hover:shadow-xl shadow-red-500/25 hover:shadow-red-500/40',
    outline: 'border-2 border-blue-500/50 text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:via-indigo-50 hover:to-purple-50 hover:border-blue-500 shadow-sm hover:shadow-md bg-white/80 backdrop-blur-sm',
    ghost: 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      ref={ref}
      disabled={loading || props.disabled}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-xl
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        transform hover:scale-[1.02] active:scale-[0.98]
        relative overflow-hidden
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Đang xử lý...
        </>
      ) : (
        children
      )}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
