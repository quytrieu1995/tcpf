import { useEffect, useState } from 'react'
import api from '../../config/api'
import { FileText, Download, CheckCircle, Clock, XCircle, Truck } from 'lucide-react'
import {
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

const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6', '#ec4899']

const OrderReport = () => {
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
      const response = await api.get(`/api/reports/orders?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`)
      setData(response.data)
    } catch (error) {
      console.error('Error fetching order report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await api.get(
        `/api/reports/export?type=orders&start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`,
        { responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `order_report_${dateRange.start_date}_${dateRange.end_date}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
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

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Chờ xử lý',
      'processing': 'Đang xử lý',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy',
      'shipped': 'Đã giao'
    }
    return labels[status] || status
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

  const summary = data.summary || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Báo cáo đặt hàng</h2>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            <div>
              <p className="text-xs text-gray-600">Tổng đơn</p>
              <p className="text-xl font-bold text-gray-900">{summary.total_orders || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-xs text-gray-600">Hoàn thành</p>
              <p className="text-xl font-bold text-green-700">{summary.completed || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="text-xs text-gray-600">Chờ xử lý</p>
              <p className="text-xl font-bold text-yellow-700">{summary.pending || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-xs text-gray-600">Đang xử lý</p>
              <p className="text-xl font-bold text-blue-700">{summary.processing || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-purple-600" />
            <div>
              <p className="text-xs text-gray-600">Đã giao</p>
              <p className="text-xl font-bold text-purple-700">{summary.shipped || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="text-xs text-gray-600">Đã hủy</p>
              <p className="text-xl font-bold text-red-700">{summary.cancelled || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders by Status Chart */}
      {data.orders_by_status && data.orders_by_status.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Đơn hàng theo trạng thái</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.orders_by_status}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, count }) => `${getStatusLabel(name)}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.orders_by_status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết trạng thái</h3>
            <div className="space-y-3">
              {data.orders_by_status.map((status, index) => (
                <div key={status.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="font-medium text-gray-900">{getStatusLabel(status.status)}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{status.count} đơn</p>
                    <p className="text-xs text-gray-500">{formatCurrency(status.total_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Orders by Day Chart */}
      {data.orders_by_day && data.orders_by_day.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Đơn hàng theo ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.orders_by_day}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="order_count" fill="#0ea5e9" name="Tổng đơn" />
              <Bar dataKey="completed_count" fill="#10b981" name="Hoàn thành" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default OrderReport
