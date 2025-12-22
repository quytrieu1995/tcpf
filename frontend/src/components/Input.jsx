import { forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'

const Input = forwardRef(({ label, error, helperText, className = '', ...props }, ref) => {
  return (
    <div className="w-full animate-slide-up">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2 tracking-tight">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 border-2 rounded-xl
            text-sm font-medium text-slate-900 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200
            ${error 
              ? 'border-red-300 bg-red-50/80 focus:ring-red-500/50 focus:border-red-500 shadow-sm' 
              : 'border-slate-200 bg-white/90 backdrop-blur-sm focus:ring-blue-500/50 focus:border-blue-500 hover:border-slate-300 shadow-sm hover:shadow-md focus:shadow-md'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center mt-2 text-sm text-red-600 animate-slide-up">
          <AlertCircle className="w-4 h-4 mr-1.5" />
          {error}
        </div>
      )}
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
