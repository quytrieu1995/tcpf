import { forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'

const Input = forwardRef(({ label, error, helperText, className = '', ...props }, ref) => {
  return (
    <div className="w-full animate-slide-up">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 border-2 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200
            ${error 
              ? 'border-red-300 bg-red-50/50 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-200 bg-white/80 backdrop-blur-sm focus:ring-primary-500 focus:border-primary-500 hover:border-gray-300'
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
