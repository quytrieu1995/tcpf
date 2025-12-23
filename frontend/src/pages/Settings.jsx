import { useState } from 'react'
import { Settings as SettingsIcon, Users, Shield, Bell, Printer, Key } from 'lucide-react'
import UsersManagement from './Users'
import PrintSettings from './PrintSettings'
import ApiTokens from './ApiTokens'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('users')

  const tabs = [
    {
      id: 'users',
      name: 'Người dùng',
      icon: Users,
      component: <UsersManagement />
    },
    {
      id: 'general',
      name: 'Cài đặt chung',
      icon: SettingsIcon,
      component: (
        <div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cài đặt chung</h3>
            <p className="text-gray-600">Tính năng đang được phát triển...</p>
          </div>
        </div>
      )
    },
    {
      id: 'notifications',
      name: 'Thông báo',
      icon: Bell,
      component: (
        <div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cài đặt thông báo</h3>
            <p className="text-gray-600">Tính năng đang được phát triển...</p>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      name: 'Bảo mật',
      icon: Shield,
      component: (
        <div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cài đặt bảo mật</h3>
            <p className="text-gray-600">Tính năng đang được phát triển...</p>
          </div>
        </div>
      )
    },
    {
      id: 'api-tokens',
      name: 'API Tokens',
      icon: Key,
      component: <ApiTokens />
    },
    {
      id: 'print',
      name: 'Mẫu in',
      icon: Printer,
      component: <PrintSettings />
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary drop-shadow-sm">
            Cài đặt
          </h1>
          <p className="text-gray-600 mt-1">Quản lý cài đặt hệ thống và người dùng</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        <div className="border-b border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm">
          <nav className="flex space-x-1 px-4" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 relative
                    ${isActive
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-white/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px] p-6">
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </div>
    </div>
  )
}

export default Settings

