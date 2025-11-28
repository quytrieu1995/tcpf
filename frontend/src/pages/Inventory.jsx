import { useEffect, useState } from 'react'
import api from '../config/api'
import { Package, AlertTriangle, TrendingUp, TrendingDown, Plus } from 'lucide-react'
import { format } from 'date-fns'

const Inventory = () => {
  const [transactions, setTransactions] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [formData, setFormData] = useState({
    product_id: '',
    type: 'adjustment',
    quantity: 0,
    notes: ''
  })
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetchData()
    fetchProducts()
  }, [])

  const fetchData = async () => {
    try {
      const [transactionsRes, lowStockRes, summaryRes] = await Promise.all([
        api.get('/inventory/transactions?limit=50'),
        api.get('/inventory/low-stock'),
        api.get('/inventory/summary')
      ])
      setTransactions(transactionsRes.data)
      setLowStock(lowStockRes.data)
      setSummary(summaryRes.data)
    } catch (error) {
      console.error('Error fetching inventory data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products?limit=1000')
      setProducts(response.data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleAdjust = async (e) => {
    e.preventDefault()
    try {
      await api.post('/inventory/adjust', formData)
      setShowAdjustModal(false)
      setFormData({ product_id: '', type: 'adjustment', quantity: 0, notes: '' })
      fetchData()
      alert('Điều chỉnh kho thành công!')
    } catch (error) {
      console.error('Error adjusting inventory:', error)
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi điều chỉnh kho')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý kho hàng</h1>
          <p className="text-gray-600 mt-1">Theo dõi và điều chỉnh tồn kho</p>
        </div>
        <button
          onClick={() => setShowAdjustModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Điều chỉnh kho
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng sản phẩm</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{summary.summary.total_products}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng tồn kho</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{summary.summary.total_stock}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hàng sắp hết</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{summary.summary.low_stock_count}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Giá trị tồn kho</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {summary.summary.total_inventory_value 
                    ? new Intl.NumberFormat('vi-VN').format(summary.summary.total_inventory_value) + 'đ'
                    : '0đ'}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mr-2" />
            <h2 className="text-lg font-semibold text-yellow-900">Cảnh báo hàng sắp hết</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left text-sm font-medium text-yellow-800 px-4 py-2">Sản phẩm</th>
                  <th className="text-left text-sm font-medium text-yellow-800 px-4 py-2">SKU</th>
                  <th className="text-left text-sm font-medium text-yellow-800 px-4 py-2">Tồn kho</th>
                  <th className="text-left text-sm font-medium text-yellow-800 px-4 py-2">Ngưỡng</th>
                  <th className="text-left text-sm font-medium text-yellow-800 px-4 py-2">Thiếu</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(item => (
                  <tr key={item.id} className="border-t border-yellow-200">
                    <td className="px-4 py-2 text-sm">{item.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{item.sku}</td>
                    <td className="px-4 py-2 text-sm font-semibold">{item.stock}</td>
                    <td className="px-4 py-2 text-sm">{item.low_stock_threshold}</td>
                    <td className="px-4 py-2 text-sm text-red-600 font-semibold">{item.shortage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lịch sử giao dịch kho</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người thực hiện</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.product_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.type === 'in' ? 'bg-green-100 text-green-800' :
                      transaction.type === 'out' ? 'bg-red-100 text-red-800' :
                      transaction.type === 'return' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.type === 'in' ? 'Nhập kho' :
                       transaction.type === 'out' ? 'Xuất kho' :
                       transaction.type === 'return' ? 'Trả hàng' :
                       'Điều chỉnh'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                    transaction.type === 'in' || transaction.type === 'return' ? 'text-green-600' :
                    transaction.type === 'out' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {transaction.type === 'in' || transaction.type === 'return' ? '+' : ''}
                    {transaction.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.created_by_name || 'System'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {transaction.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Điều chỉnh kho</h2>
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm *</label>
                <select
                  required
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Chọn sản phẩm</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Tồn: {product.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại giao dịch *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="in">Nhập kho</option>
                  <option value="out">Xuất kho</option>
                  <option value="adjustment">Điều chỉnh</option>
                  <option value="return">Trả hàng</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows="3"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustModal(false)
                    setFormData({ product_id: '', type: 'adjustment', quantity: 0, notes: '' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Điều chỉnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory

