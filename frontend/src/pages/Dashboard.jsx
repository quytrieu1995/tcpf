import { useEffect, useState } from 'react'
import api from '../config/api'
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Truck,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
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
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { format } from 'date-fns'
import Button from '../components/Button'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/dashboard/stats?period=${period}`)
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!stats) {
    return <div className="text-center text-gray-500">Không thể tải dữ liệu</div>
  }

  const StatCard = ({ title, value, icon: Icon, gradient, trend, trendValue, index = 0 }) => (
    <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 card-hover animate-slide-up overflow-hidden"
         style={{ animationDelay: `${index * 100}ms` }}>
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mt-2">{value}</p>
          {trend && trendValue && (
            <div className={`mt-3 flex items-center text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? (
                <ArrowUpRight className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 mr-1" />
              )}
              <span>{Math.abs(trendValue)}% so với kỳ trước</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} ml-4 shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      
      {/* Decorative corner */}
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full`}></div>
    </div>
  )

  const formatCurrency = (value) => {
    if (!value) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value)
  }

  const formatNumber = (value) => {
    return new Intl.NumberFormat('vi-VN').format(value)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="animate-slide-up">
          <h1 className="text-3xl sm:text-4xl font-bold text-gradient-primary mb-2">Dashboard</h1>
          <p className="text-gray-600 text-sm sm:text-base">Tổng quan về hoạt động bán hàng</p>
        </div>
        <div className="flex items-center gap-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <Button
            variant={period === '7' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setPeriod('7')}
          >
            7 ngày
          </Button>
          <Button
            variant={period === '30' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setPeriod('30')}
          >
            30 ngày
          </Button>
          <Button
            variant={period === '90' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setPeriod('90')}
          >
            90 ngày
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Doanh thu"
          value={formatCurrency(stats.overview.totalRevenue)}
          icon={DollarSign}
          gradient="from-green-500 to-emerald-600"
          trend={stats.overview.revenueGrowth}
          trendValue={stats.overview.revenueGrowth}
          index={0}
        />
        <StatCard
          title="Đơn hàng"
          value={formatNumber(stats.overview.totalOrders)}
          icon={ShoppingCart}
          gradient="from-blue-500 to-cyan-600"
          trend={stats.overview.ordersGrowth}
          trendValue={stats.overview.ordersGrowth}
          index={1}
        />
        <StatCard
          title="Khách hàng"
          value={formatNumber(stats.overview.totalCustomers)}
          icon={Users}
          gradient="from-purple-500 to-pink-600"
          index={2}
        />
        <StatCard
          title="Giá trị đơn TB"
          value={formatCurrency(stats.overview.avgOrderValue)}
          icon={TrendingUp}
          gradient="from-orange-500 to-red-600"
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Sản phẩm"
          value={formatNumber(stats.overview.totalProducts)}
          icon={Package}
          gradient="from-indigo-500 to-purple-600"
          index={4}
        />
        <StatCard
          title="Hàng sắp hết"
          value={formatNumber(stats.overview.lowStockProducts)}
          icon={AlertTriangle}
          gradient="from-red-500 to-pink-600"
          index={5}
        />
        <StatCard
          title="Đơn COD"
          value={formatNumber(stats.codStats?.total_orders || 0)}
          icon={CreditCard}
          gradient="from-yellow-500 to-amber-600"
          index={6}
        />
        <StatCard
          title="Tổng COD"
          value={formatCurrency(stats.codStats?.total_cod || 0)}
          icon={DollarSign}
          gradient="from-pink-500 to-rose-600"
          index={7}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue by Day */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 card-hover animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Doanh thu theo ngày</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.revenueByDay}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'dd/MM')}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy')}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Doanh thu"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Month */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 card-hover animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Doanh thu theo tháng (6 tháng gần đây)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tickFormatter={(date) => format(new Date(date), 'MM/yyyy')}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(date) => format(new Date(date), 'MM/yyyy')}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#0ea5e9" name="Doanh thu" />
              <Bar dataKey="order_count" fill="#f59e0b" name="Số đơn" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Orders by Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 card-hover animate-slide-up" style={{ animationDelay: '400ms' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Đơn hàng theo trạng thái</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.ordersByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {stats.ordersByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Delivery Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 card-hover animate-slide-up" style={{ animationDelay: '500ms' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái giao hàng</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.deliveryStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {stats.deliveryStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Payment Methods */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 card-hover animate-slide-up" style={{ animationDelay: '600ms' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Phương thức thanh toán</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.paymentMethods} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="payment_method" type="category" width={100} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'revenue') return formatCurrency(value)
                  return value
                }}
              />
              <Legend />
              <Bar dataKey="count" fill="#0ea5e9" name="Số đơn" />
              <Bar dataKey="revenue" fill="#10b981" name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sales Channels */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 card-hover animate-slide-up" style={{ animationDelay: '700ms' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kênh bán hàng</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.salesChannels}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'revenue') return formatCurrency(value)
                  return value
                }}
              />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" name="Số đơn" />
              <Bar dataKey="revenue" fill="#ec4899" name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 card-hover animate-slide-up" style={{ animationDelay: '800ms' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sản phẩm bán chạy</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.topProducts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'total_revenue') return formatCurrency(value)
                return value
              }}
            />
            <Legend />
            <Bar dataKey="total_sold" fill="#0ea5e9" name="Số lượng bán" />
            <Bar dataKey="total_revenue" fill="#10b981" name="Doanh thu" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Customers */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 card-hover animate-slide-up" style={{ animationDelay: '900ms' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Khách hàng hàng đầu</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số đơn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng doanh thu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đã thanh toán</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.topCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                    {customer.email && (
                      <div className="text-xs text-gray-500">{customer.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatNumber(customer.order_count)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(customer.total_revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {formatCurrency(customer.total_paid || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 overflow-x-auto card-hover animate-slide-up" style={{ animationDelay: '1000ms' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Đơn hàng gần đây</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã đơn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thanh toán</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.customer_name || 'Khách vãng lai'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {order.payment_method === 'cash' ? 'Tiền mặt' :
                     order.payment_method === 'bank_transfer' ? 'Chuyển khoản' :
                     order.payment_method === 'credit' ? 'Trả chậm' :
                     order.payment_method === 'card' ? 'Thẻ' : order.payment_method || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status === 'completed' ? 'Hoàn thành' :
                       order.status === 'processing' ? 'Đang xử lý' :
                       order.status === 'cancelled' ? 'Đã hủy' :
                       'Chờ xử lý'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COD & Return Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 card-hover animate-slide-up" style={{ animationDelay: '1100ms' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thống kê COD</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tổng số đơn COD:</span>
              <span className="text-sm font-semibold text-gray-900">{formatNumber(stats.codStats?.total_orders || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tổng giá trị COD:</span>
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(stats.codStats?.total_cod || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Đã thu:</span>
              <span className="text-sm font-semibold text-green-600">{formatCurrency(stats.codStats?.total_paid || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">COD trung bình:</span>
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(stats.codStats?.avg_cod || 0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 card-hover animate-slide-up" style={{ animationDelay: '1200ms' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thống kê trả hàng</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Số đơn trả hàng:</span>
              <span className="text-sm font-semibold text-gray-900">{formatNumber(stats.returnStats?.return_count || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tổng phí trả hàng:</span>
              <span className="text-sm font-semibold text-red-600">{formatCurrency(stats.returnStats?.total_return_fee || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
