import { useState } from 'react'
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Package, 
  Users, 
  Building, 
  UserCheck,
  ShoppingBag,
  DollarSign,
  Calendar,
  Download
} from 'lucide-react'
import BusinessAnalysis from './reports/BusinessAnalysis'
import ProductAnalysis from './reports/ProductAnalysis'
import CustomerAnalysis from './reports/CustomerAnalysis'
import EfficiencyAnalysis from './reports/EfficiencyAnalysis'
import EndOfDayReport from './reports/EndOfDayReport'
import SalesReport from './reports/SalesReport'
import OrderReport from './reports/OrderReport'
import ProductReport from './reports/ProductReport'
import CustomerReport from './reports/CustomerReport'
import SupplierReport from './reports/SupplierReport'
import EmployeeReport from './reports/EmployeeReport'
import SalesChannelReport from './reports/SalesChannelReport'
import FinanceReport from './reports/FinanceReport'

const Reports = () => {
  const [activeTab, setActiveTab] = useState('analysis')
  const [activeAnalysis, setActiveAnalysis] = useState('business')
  const [activeReport, setActiveReport] = useState('end-of-day')

  const analysisTabs = [
    {
      id: 'business',
      name: 'Kinh doanh',
      icon: TrendingUp,
      component: <BusinessAnalysis />
    },
    {
      id: 'products',
      name: 'Hàng hóa',
      icon: Package,
      component: <ProductAnalysis />
    },
    {
      id: 'customers',
      name: 'Khách hàng',
      icon: Users,
      component: <CustomerAnalysis />
    },
    {
      id: 'efficiency',
      name: 'Hiệu quả',
      icon: BarChart3,
      component: <EfficiencyAnalysis />
    }
  ]

  const reportTabs = [
    {
      id: 'end-of-day',
      name: 'Cuối ngày',
      icon: Calendar,
      component: <EndOfDayReport />
    },
    {
      id: 'sales',
      name: 'Bán hàng',
      icon: ShoppingBag,
      component: <SalesReport />
    },
    {
      id: 'orders',
      name: 'Đặt hàng',
      icon: FileText,
      component: <OrderReport />
    },
    {
      id: 'products',
      name: 'Hàng hóa',
      icon: Package,
      component: <ProductReport />
    },
    {
      id: 'customers',
      name: 'Khách hàng',
      icon: Users,
      component: <CustomerReport />
    },
    {
      id: 'suppliers',
      name: 'Nhà cung cấp',
      icon: Building,
      component: <SupplierReport />
    },
    {
      id: 'employees',
      name: 'Nhân viên',
      icon: UserCheck,
      component: <EmployeeReport />
    },
    {
      id: 'sales-channels',
      name: 'Kênh bán hàng',
      icon: ShoppingBag,
      component: <SalesChannelReport />
    },
    {
      id: 'finance',
      name: 'Tài chính',
      icon: DollarSign,
      component: <FinanceReport />
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary drop-shadow-sm">
            Phân tích & Báo cáo
          </h1>
          <p className="text-gray-600 mt-1">Theo dõi và phân tích hiệu suất kinh doanh</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        <div className="border-b border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm">
          <nav className="flex space-x-1 px-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 relative
                ${activeTab === 'analysis'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                }
              `}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Phân tích</span>
              {activeTab === 'analysis' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 relative
                ${activeTab === 'reports'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                }
              `}
            >
              <FileText className="w-5 h-5" />
              <span>Báo cáo</span>
              {activeTab === 'reports' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              )}
            </button>
          </nav>
        </div>

        {/* Analysis Section */}
        {activeTab === 'analysis' && (
          <div>
            <div className="border-b border-gray-200/50 bg-gray-50/50 px-4 py-2">
              <div className="flex space-x-2 overflow-x-auto">
                {analysisTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeAnalysis === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveAnalysis(tab.id)}
                      className={`
                        flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap
                        ${isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="min-h-[600px] p-6">
              {analysisTabs.find(tab => tab.id === activeAnalysis)?.component}
            </div>
          </div>
        )}

        {/* Reports Section */}
        {activeTab === 'reports' && (
          <div>
            <div className="border-b border-gray-200/50 bg-gray-50/50 px-4 py-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {reportTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeReport === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveReport(tab.id)}
                      className={`
                        flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="truncate">{tab.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="min-h-[600px] p-6">
              {reportTabs.find(tab => tab.id === activeReport)?.component}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Reports
