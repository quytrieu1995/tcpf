import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  User,
  FileText,
  Truck,
  Building,
  Warehouse,
  Tag,
  BarChart3,
  Store,
  Settings,
  Bell,
  ChevronDown,
  Menu,
  X,
  Calendar,
  DollarSign
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import Notifications from './Notifications'
import UserMenu from './UserMenu'

const KiotVietLayout = () => {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menuRefs = useRef({})

  // Xác định menu active dựa trên pathname
  useEffect(() => {
    const path = location.pathname
    if (path.startsWith('/dashboard')) {
      setActiveMenu('tong-quan')
    } else if (path.startsWith('/products') || path.startsWith('/categories')) {
      setActiveMenu('hang-hoa')
    } else if (path.startsWith('/orders') || path.startsWith('/purchase-orders') || path.startsWith('/shipments') || path.startsWith('/reconciliation')) {
      setActiveMenu('don-hang')
    } else if (path.startsWith('/customers') || path.startsWith('/promotions')) {
      setActiveMenu('khach-hang')
    } else if (path.startsWith('/users')) {
      setActiveMenu('nhan-vien')
    } else if (path.startsWith('/reports')) {
      setActiveMenu('phan-tich')
    } else {
      setActiveMenu(null)
    }
  }, [location.pathname])

  // Đóng menu khi click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.values(menuRefs.current).forEach(ref => {
        if (ref && !ref.contains(event.target)) {
          setActiveMenu(null)
        }
      })
    }

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeMenu])

  const navigationMenus = {
    'tong-quan': {
      label: 'Tổng quan',
      icon: LayoutDashboard,
      href: '/dashboard',
      items: []
    },
    'hang-hoa': {
      label: 'Hàng hóa',
      icon: Package,
      items: [
        {
          title: 'Hàng hóa',
          items: [
            { name: 'Danh sách hàng hóa', href: '/products', icon: Package },
            { name: 'Thiết lập giá', href: '/price-policies', icon: Tag },
            { name: 'Danh mục', href: '/categories', icon: FileText },
          ]
        },
        {
          title: 'Kho hàng',
          items: [
            { name: 'Tồn kho', href: '/inventory', icon: Warehouse },
            { name: 'Kiểm kho', href: '/stock-adjustments', icon: FileText },
            { name: 'Xuất hủy', href: '/stock-adjustments?type=out', icon: Package },
          ]
        },
        {
          title: 'Nhập hàng',
          items: [
            { name: 'Hóa đơn đầu vào', href: '/purchase-orders', icon: FileText, badge: 'Mới' },
            { name: 'Nhà cung cấp', href: '/suppliers', icon: Building },
            { name: 'Nhập hàng', href: '/purchase-orders/create', icon: Package },
            { name: 'Trả hàng nhập', href: '/purchase-orders?type=return', icon: Truck },
          ]
        }
      ]
    },
    'don-hang': {
      label: 'Đơn hàng',
      icon: ShoppingCart,
      items: [
        {
          title: 'Đơn hàng',
          items: [
            { name: 'Đặt hàng', href: '/orders/create', icon: ShoppingCart },
            { name: 'Hóa đơn', href: '/orders', icon: FileText },
            { name: 'Trả hàng', href: '/orders?type=return', icon: Package },
          ]
        },
        {
          title: 'Vận chuyển',
          items: [
            { name: 'Đối tác giao hàng', href: '/shipping-carriers', icon: Truck },
            { name: 'Vận đơn', href: '/shipments', icon: Truck },
            { name: 'Đối soát', href: '/reconciliation', icon: FileText },
          ]
        }
      ]
    },
    'khach-hang': {
      label: 'Khách hàng',
      icon: Users,
      items: [
        {
          title: 'Khách hàng',
          items: [
            { name: 'Danh sách khách hàng', href: '/customers', icon: Users },
            { name: 'Khuyến mại', href: '/promotions', icon: Tag },
            { name: 'Voucher', href: '/promotions?type=voucher', icon: Tag },
            { name: 'Coupon', href: '/promotions?type=coupon', icon: Tag },
          ]
        }
      ]
    },
    'nhan-vien': {
      label: 'Nhân viên',
      icon: User,
      items: [
        {
          title: 'Nhân viên',
          items: [
            { name: 'Danh sách nhân viên', href: '/users', icon: Users },
            { name: 'Lịch làm việc', href: '/users/schedule', icon: Calendar },
            { name: 'Bảng chấm công', href: '/users/timesheet', icon: FileText },
            { name: 'Bảng lương', href: '/users/payroll', icon: FileText },
            { name: 'Bảng hoa hồng', href: '/users/commission', icon: BarChart3 },
            { name: 'Thiết lập nhân viên', href: '/users/settings', icon: Settings },
          ]
        }
      ]
    },
    'so-quy': {
      label: 'Sổ quỹ',
      icon: DollarSign,
      items: [
        {
          title: 'Sổ quỹ',
          items: [
            { name: 'Thu chi', href: '/cashbook', icon: DollarSign },
            { name: 'Báo cáo quỹ', href: '/cashbook/reports', icon: BarChart3 },
          ]
        }
      ]
    },
    'phan-tich': {
      label: 'Phân tích',
      icon: BarChart3,
      items: [
        {
          title: 'Phân tích',
          items: [
            { name: 'Kinh doanh', href: '/reports/business', icon: BarChart3 },
            { name: 'Hàng hóa', href: '/reports/products', icon: Package },
            { name: 'Khách hàng', href: '/reports/customers', icon: Users },
            { name: 'Hiệu quả', href: '/reports/efficiency', icon: BarChart3 },
          ]
        },
        {
          title: 'Báo cáo',
          items: [
            { name: 'Báo cáo', href: '/reports', icon: FileText },
            { name: 'Cuối ngày', href: '/reports/end-of-day', icon: FileText },
            { name: 'Bán hàng', href: '/reports/sales', icon: BarChart3 },
            { name: 'Đặt hàng', href: '/reports/orders', icon: ShoppingCart },
            { name: 'Hàng hóa', href: '/reports/products', icon: Package },
            { name: 'Khách hàng', href: '/reports/customers', icon: Users },
            { name: 'Nhà cung cấp', href: '/reports/suppliers', icon: Building },
            { name: 'Nhân viên', href: '/reports/employees', icon: User },
            { name: 'Kênh bán hàng', href: '/reports/sales-channels', icon: Store },
            { name: 'Tài chính', href: '/reports/finance', icon: BarChart3 },
          ]
        }
      ]
    },
    'ban-online': {
      label: 'Bán online',
      icon: Store,
      items: [
        {
          title: 'Bán online',
          items: [
            { name: 'Kênh bán hàng', href: '/online-channels', icon: Store },
            { name: 'Đồng bộ đơn hàng', href: '/online-channels/sync', icon: ShoppingCart },
          ]
        }
      ]
    }
  }

  const handleMenuClick = (menuKey) => {
    if (activeMenu === menuKey) {
      setActiveMenu(null)
    } else {
      setActiveMenu(menuKey)
    }
  }

  const handleMenuItemClick = (href) => {
    navigate(href)
    setActiveMenu(null)
    setSidebarOpen(false)
  }

  const isActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === href
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 shadow-sm z-50 sticky top-0">
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-[#00A19A] rounded-l-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-sm"></div>
                </div>
                <div className="w-8 h-8 bg-[#2FAC66] rounded-r-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">KiotViet</span>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Delivery notification */}
            <div className="hidden md:flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer">
              <div className="relative">
                <Truck className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#2FAC66] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">+</span>
                </span>
              </div>
              <span className="text-sm font-medium">Giao</span>
            </div>

            {/* Notifications */}
            <Notifications />

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Top Navigation Bar */}
      <nav className="bg-[#00A19A] text-white shadow-md sticky top-16 z-40">
        <div className="flex items-center overflow-x-auto">
          {Object.entries(navigationMenus).map(([key, menu]) => {
            const Icon = menu.icon
            const isActiveMenu = activeMenu === key || (menu.href && isActive(menu.href))
            
            return (
              <div key={key} className="relative" ref={el => menuRefs.current[key] = el}>
                {menu.href ? (
                  <Link
                    to={menu.href}
                    className={`
                      flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap
                      ${isActiveMenu 
                        ? 'bg-[#008B85] text-white' 
                        : 'hover:bg-[#00B8B0] text-white'
                      }
                    `}
                    onClick={() => {
                      setActiveMenu(null)
                      setSidebarOpen(false)
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{menu.label}</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => handleMenuClick(key)}
                    className={`
                      flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap
                      ${isActiveMenu 
                        ? 'bg-[#008B85] text-white' 
                        : 'hover:bg-[#00B8B0] text-white'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{menu.label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isActiveMenu ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {/* Dropdown Menu */}
                {isActiveMenu && menu.items && menu.items.length > 0 && (
                  <div className="absolute top-full left-0 bg-white shadow-xl border border-gray-200 rounded-lg mt-1 min-w-[600px] z-50">
                    <div className="p-4 grid grid-cols-3 gap-6">
                      {menu.items.map((group, groupIndex) => (
                        <div key={groupIndex} className="space-y-2">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            {group.title}
                          </h3>
                          <div className="space-y-1">
                            {group.items.map((item, itemIndex) => {
                              const ItemIcon = item.icon
                              return (
                                <button
                                  key={itemIndex}
                                  onClick={() => handleMenuItemClick(item.href)}
                                  className={`
                                    w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg transition-colors
                                    ${isActive(item.href) 
                                      ? 'bg-[#00A19A]/10 text-[#00A19A] font-medium' 
                                      : 'hover:bg-gray-50'
                                    }
                                  `}
                                >
                                  <ItemIcon className="w-4 h-4" />
                                  <span className="flex-1 text-left">{item.name}</span>
                                  {item.badge && (
                                    <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                                      {item.badge}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-40 lg:hidden overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <span className="font-semibold text-gray-900">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {Object.entries(navigationMenus).map(([key, menu]) => {
                const Icon = menu.icon
                return (
                  <div key={key} className="space-y-2">
                    {menu.href ? (
                      <Link
                        to={menu.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                          ${isActive(menu.href) 
                            ? 'bg-[#00A19A]/10 text-[#00A19A]' 
                            : 'text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{menu.label}</span>
                      </Link>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700">
                          <Icon className="w-4 h-4" />
                          <span>{menu.label}</span>
                        </div>
                        {menu.items?.map((group, groupIndex) => (
                          <div key={groupIndex} className="pl-6 space-y-1">
                            {group.items.map((item, itemIndex) => {
                              const ItemIcon = item.icon
                              return (
                                <Link
                                  key={itemIndex}
                                  to={item.href}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`
                                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                                    ${isActive(item.href) 
                                      ? 'bg-[#00A19A]/10 text-[#00A19A] font-medium' 
                                      : 'text-gray-600 hover:bg-gray-50'
                                    }
                                  `}
                                >
                                  <ItemIcon className="w-4 h-4" />
                                  <span>{item.name}</span>
                                </Link>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default KiotVietLayout

