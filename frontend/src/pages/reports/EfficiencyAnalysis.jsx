import { useEffect, useState } from 'react'
import api from '../../config/api'
import { BarChart3, TrendingUp, TrendingDown, Clock, Target, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import DateRangeSelector from '../../components/DateRangeSelector'
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

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#ec4899']

const EfficiencyAnalysis = () => {
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
      const response = await api.get(`/api/reports/efficiency?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`)
      setData(response.data)
    } catch (error) {
      console.error('Error fetching efficiency analysis:', error)
    } finally {
      setLoading(false)
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

  const metrics = data.metrics || {}
  const efficiencyByDay = data.efficiency_by_day || []
  const ordersByStatus = data.orders_by_status || []
  const employeePerformance = data.employee_performance || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Phân tích hiệu quả</h2>
        <DateRangeSelector
          onDateRangeChange={(newRange) => setDateRange(newRange)}
          defaultStartDate={dateRange.start_date}
          defaultEndDate={dateRange.end_date}
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tỷ lệ hoàn thành</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.completion_rate || 0}%</p>
              {metrics.completion_rate_growth && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${metrics.completion_rate_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.completion_rate_growth >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(metrics.completion_rate_growth)}% so với kỳ trước</span>
                </div>
              )}
            </div>
            <Target className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Thời gian xử lý TB</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {metrics.avg_processing_hours || 0}h
              </p>
              <p className="text-xs text-gray-500 mt-1">Từ tạo đến hoàn thành</p>
            </div>
            <Clock className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Đơn hàng/Khách hàng</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {metrics.orders_per_customer?.toFixed(1) || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">{metrics.unique_customers || 0} khách hàng</p>
            </div>
            <Users className="w-10 h-10 text-purple-500" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng đơn hàng</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.total_orders || 0}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>{metrics.completed_orders || 0} hoàn thành</span>
              </div>
            </div>
            <BarChart3 className="w-10 h-10 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Efficiency Trend Chart */}
      {efficiencyByDay.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Xu hướng hiệu quả theo ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={efficiencyByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="completion_rate" 
                stroke="#0ea5e9" 
                strokeWidth={2} 
                name="Tỷ lệ hoàn thành (%)" 
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avg_processing_hours" 
                stroke="#10b981" 
                strokeWidth={2} 
                name="Thời gian xử lý (h)" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        {ordersByStatus.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Đơn hàng theo trạng thái</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {ordersByStatus.map((status, index) => {
                const statusLabels = {
                  'completed': 'Hoàn thành',
                  'pending': 'Chờ xử lý',
                  'processing': 'Đang xử lý',
                  'cancelled': 'Đã hủy',
                  'shipped': 'Đã giao'
                }
                return (
                  <div key={status.status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-gray-700">{statusLabels[status.status] || status.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{status.count}</span>
                      <span className="text-gray-500">({status.percentage}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Employee Performance */}
        {employeePerformance.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hiệu suất nhân viên</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {employeePerformance.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{emp.full_name || emp.username}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                      <span>{emp.total_orders} đơn</span>
                      <span>{emp.completed_orders} hoàn thành</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">{emp.completion_rate}%</p>
                    <p className="text-xs text-gray-500">{formatCurrency(emp.total_revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Hoàn thành</p>
              <p className="text-xl font-bold text-green-700">{metrics.completed_orders || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">Chờ xử lý</p>
              <p className="text-xl font-bold text-yellow-700">{metrics.pending_orders || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Đang xử lý</p>
              <p className="text-xl font-bold text-blue-700">{metrics.processing_orders || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Đã hủy</p>
              <p className="text-xl font-bold text-red-700">{metrics.cancelled_orders || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EfficiencyAnalysis

