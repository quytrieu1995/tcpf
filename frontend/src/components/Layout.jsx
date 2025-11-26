import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  LogOut,
  Menu,
  X,
  FolderTree,
  Tag,
  Warehouse,
  FileText,
  Truck,
  Building
} from 'lucide-react'
import { useState } from 'react'

const Layout = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Sản phẩm', href: '/products', icon: Package },
    { name: 'Danh mục', href: '/categories', icon: FolderTree },
    { name: 'Tạo đơn hàng', href: '/orders/create', icon: ShoppingCart },
    { name: 'Đơn hàng', href: '/orders', icon: ShoppingCart },
    { name: 'Đặt hàng', href: '/purchase-orders', icon: Package },
    { name: 'Khách hàng', href: '/customers', icon: Users },
    { name: 'Nhà cung cấp', href: '/suppliers', icon: Building },
    { name: 'Xuất hủy', href: '/stock-adjustments', icon: Warehouse },
    { name: 'Đơn vị vận chuyển', href: '/shipping-carriers', icon: Truck },
    { name: 'Vận đơn', href: '/shipments', icon: Truck },
    { name: 'Khuyến mãi', href: '/promotions', icon: Tag },
    { name: 'Kho hàng', href: '/inventory', icon: Warehouse },
    { name: 'Người dùng', href: '/users', icon: Users },
    { name: 'Báo cáo', href: '/reports', icon: FileText },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <h1 className="text-xl font-bold text-primary-600">Sales Dashboard</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                    ${isActive(item.href)
                      ? 'bg-primary-600 text-white shadow-md transform scale-105'
                      : 'text-gray-700 hover:bg-gray-100 hover:translate-x-1'
                    }
                  `}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive(item.href) ? 'text-white' : ''}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 h-16 flex items-center px-4 sm:px-6 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu size={24} />
          </button>
          <div className="ml-auto flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-semibold">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
              <span>Xin chào, <span className="font-medium text-gray-900">{user?.username}</span></span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

