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
  Building,
  Sparkles
} from 'lucide-react'
import { useState } from 'react'

const Layout = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigationGroups = [
    {
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, gradient: 'from-blue-500 to-cyan-500' },
      ]
    },
    {
      title: 'Sản phẩm',
      items: [
        { name: 'Sản phẩm', href: '/products', icon: Package, gradient: 'from-purple-500 to-pink-500' },
        { name: 'Danh mục', href: '/categories', icon: FolderTree, gradient: 'from-indigo-500 to-purple-500' },
      ]
    },
    {
      title: 'Đơn hàng',
      items: [
        { name: 'Tạo đơn hàng', href: '/orders/create', icon: ShoppingCart, gradient: 'from-green-500 to-emerald-500' },
        { name: 'Hóa đơn', href: '/orders', icon: ShoppingCart, gradient: 'from-blue-500 to-indigo-500' },
        { name: 'Đặt hàng', href: '/purchase-orders', icon: Package, gradient: 'from-orange-500 to-red-500' },
        { name: 'Vận đơn', href: '/shipments', icon: Truck, gradient: 'from-teal-500 to-cyan-500' },
        { name: 'Đơn vị vận chuyển', href: '/shipping-carriers', icon: Truck, gradient: 'from-violet-500 to-purple-500' },
      ]
    },
    {
      title: 'Nhà cung cấp',
      items: [
        { name: 'Nhà cung cấp', href: '/suppliers', icon: Building, gradient: 'from-amber-500 to-yellow-500' },
        { name: 'Xuất hủy', href: '/stock-adjustments', icon: Warehouse, gradient: 'from-red-500 to-pink-500' },
      ]
    },
    {
      title: 'Khách hàng',
      items: [
        { name: 'Khách hàng', href: '/customers', icon: Users, gradient: 'from-cyan-500 to-blue-500' },
        { name: 'Khuyến mãi', href: '/promotions', icon: Tag, gradient: 'from-pink-500 to-rose-500' },
      ]
    },
    {
      items: [
        { name: 'Kho hàng', href: '/inventory', icon: Warehouse, gradient: 'from-slate-500 to-gray-500' },
        { name: 'Người dùng', href: '/users', icon: Users, gradient: 'from-emerald-500 to-teal-500' },
        { name: 'Báo cáo', href: '/reports', icon: FileText, gradient: 'from-blue-500 to-indigo-500' },
      ]
    },
  ]

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === path
    }
    if (location.pathname === path) {
      return true
    }
    if (location.pathname.startsWith(path + '/')) {
      return true
    }
    return false
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-pink-200/30 to-yellow-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-200/30 to-blue-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-white via-white to-slate-50 shadow-2xl transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        border-r border-gradient-to-b from-transparent via-slate-200/50 to-transparent
      `}>
        <div className="flex flex-col h-full relative">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gradient-to-r from-transparent via-slate-200 to-transparent bg-gradient-to-r from-blue-500/5 to-purple-500/5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg transform hover:scale-110 transition-transform duration-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gradient-primary">Sales Dashboard</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="space-y-6">
              {navigationGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="animate-slide-in-left" style={{ animationDelay: `${groupIndex * 50}ms` }}>
                  {group.title && (
                    <div className="px-4 mb-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {group.title}
                      </h3>
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item, itemIndex) => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                            group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden
                            ${active
                              ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg transform scale-105`
                              : 'text-gray-700 hover:bg-gradient-to-r hover:from-slate-100 hover:to-gray-50 hover:translate-x-1'
                            }
                          `}
                          style={{ animationDelay: `${(groupIndex * 50) + (itemIndex * 20)}ms` }}
                        >
                          {active && (
                            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
                          )}
                          <Icon className={`mr-3 h-5 w-5 relative z-10 ${active ? 'text-white' : 'text-gray-600 group-hover:text-primary-600'} transition-colors`} />
                          <span className="relative z-10">{item.name}</span>
                          {active && (
                            <div className="absolute right-2 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gradient-to-r from-transparent via-slate-200 to-transparent bg-gradient-to-t from-slate-50 to-white">
            <div className="flex items-center justify-between mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-sm">{user?.username?.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/60 h-16 flex items-center px-4 sm:px-6 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100"
            aria-label="Mở menu"
          >
            <Menu size={24} />
          </button>
          <div className="ml-auto flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3 text-sm text-slate-700 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/60 shadow-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xs">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
              <span className="font-medium">Xin chào, <span className="font-bold text-slate-900">{user?.username}</span></span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full overflow-y-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
