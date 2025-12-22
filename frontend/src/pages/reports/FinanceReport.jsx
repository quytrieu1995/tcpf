import { useEffect, useState } from 'react'
import api from '../../config/api'
import { DollarSign, Download, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6']

const FinanceReport = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/reports/finance?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`)
      setData(response.data)
    } catch (error) {
      console.error('Error fetching finance report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      alert('Tính năng xuất báo cáo tài chính đang được phát triển')
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Có lỗi xảy ra khi xuất báo cáo')
    }
  }

  const formatCurrency = (value) => {
    if (!value) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
        <p className="text-gray-600">Không thể tải dữ liệu</p>
      </div>
    )
  }

  const revenue = data.revenue || {}
  const expenses = data.expenses || {}
  const profit = data.profit || 0
  const profitMargin = parseFloat(data.profit_margin || 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Báo cáo tài chính</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-600">đến</span>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Doanh thu</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {formatCurrency(revenue.total)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{revenue.orders || 0} đơn</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Chi phí</p>
              <p className="text-2xl font-bold text-red-700 mt-1">
                {formatCurrency(expenses.total)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{expenses.orders || 0} đơn mua</p>
            </div>
            <TrendingDown className="w-10 h-10 text-red-600" />
          </div>
        </div>
        <div className={`${profit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} rounded-xl p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lợi nhuận</p>
              <p className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(profit)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Biên lợi nhuận: {profitMargin}%</p>
            </div>
            {profit >= 0 ? (
              <ArrowUpRight className="w-10 h-10 text-blue-600" />
            ) : (
              <ArrowDownRight className="w-10 h-10 text-red-600" />
            )}
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Giảm giá</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(revenue.discounts)}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Revenue by Day */}
      {data.revenue_by_day && data.revenue_by_day.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Doanh thu và chiết khấu theo ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.revenue_by_day}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Doanh thu" />
              <Line type="monotone" dataKey="discounts" stroke="#f59e0b" strokeWidth={2} name="Chiết khấu" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payment Methods */}
      {data.payment_methods && data.payment_methods.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Doanh thu theo phương thức thanh toán</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.payment_methods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ payment_method, revenue }) => `${payment_method}: ${formatCurrency(revenue)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {data.payment_methods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết phương thức thanh toán</h3>
            <div className="space-y-3">
              {data.payment_methods.map((payment, index) => (
                <div key={payment.payment_method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="font-medium text-gray-900">{payment.payment_method || 'Không xác định'}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(payment.revenue)}</p>
                    <p className="text-xs text-gray-500">{payment.order_count} đơn</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinanceReport
