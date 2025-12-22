import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'

const UserMenu = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    {
      icon: User,
      label: 'Thông tin cá nhân',
      onClick: () => {
        setIsOpen(false)
        // Navigate to profile page when created
        // navigate('/profile')
      },
      divider: false
    },
    {
      icon: Settings,
      label: 'Cài đặt',
      onClick: () => {
        setIsOpen(false)
        navigate('/settings')
      },
      divider: true
    },
    {
      icon: LogOut,
      label: 'Đăng xuất',
      onClick: handleLogout,
      danger: true,
      divider: false
    }
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 text-sm text-slate-700 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/60 shadow-sm hover:shadow-md hover:bg-white transition-all duration-200"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-xs">
            {user?.username?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="hidden md:block text-left">
          <div className="font-medium">Xin chào, <span className="font-bold text-slate-900">{user?.username}</span></div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 z-50 animate-slide-up">
          <div className="p-4 border-b border-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.username}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="py-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index}>
                  {item.divider && index > 0 && (
                    <div className="my-1 border-t border-gray-200/50"></div>
                  )}
                  <button
                    onClick={item.onClick}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
                      ${item.danger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${item.danger ? 'text-red-600' : 'text-gray-600'}`} />
                    <span>{item.label}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu

