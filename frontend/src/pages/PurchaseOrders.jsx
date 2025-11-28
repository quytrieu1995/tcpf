import { useEffect, useState } from 'react'
import api from '../config/api'
import { Plus, Eye, Package, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { SkeletonTable } from '../components/Skeleton'

const PurchaseOrders = () => {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    supplier_id: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0 }],
    expected_date: '',
    notes: ''
  })

  useEffect(() => {
    fetchOrders()
    fetchSuppliers()
    fetchProducts()
  }, [statusFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const url = `/purchase-orders?status=${statusFilter}&limit=1000`
      const response = await api.get(url)
      setOrders(response.data.orders || [])
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      toast.error('Không thể tải danh sách đơn đặt hàng')
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers?limit=1000')
      setSuppliers(response.data)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
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

  const handleViewDetails = async (order) => {
    try {
      const response = await api.get(`/purchase-orders/${order.id}`)
      setSelectedOrder(response.data)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error fetching order details:', error)
      toast.error('Không thể tải chi tiết đơn hàng')
    }
  }

  const handleReceive = async () => {
    if (!selectedOrder) return

    const receivedItems = selectedOrder.items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity - (item.received_quantity || 0),
      unit_price: item.price
    })).filter(item => item.quantity > 0)

    if (receivedItems.length === 0) {
      toast.warning('Tất cả hàng đã được nhận')
      return
    }

    try {
      await api.post(`/purchase-orders/${selectedOrder.id}/receive`, {
        received_items: receivedItems
      })
      toast.success('Nhận hàng thành công!')
      setShowDetailsModal(false)
      fetchOrders()
    } catch (error) {
      console.error('Error receiving order:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi nhận hàng')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.supplier_id) {
      toast.warning('Vui lòng chọn nhà cung cấp')
      return
    }
    if (formData.items.length === 0 || formData.items.some(item => !item.product_id || item.quantity <= 0)) {
      toast.warning('Vui lòng thêm ít nhất một sản phẩm')
      return
    }

    try {
      await api.post('/purchase-orders', formData)
      toast.success('Tạo đơn đặt hàng thành công!')
      setShowCreateModal(false)
      setFormData({
        supplier_id: '',
        items: [{ product_id: '', quantity: 1, unit_price: 0 }],
        expected_date: '',
        notes: ''
      })
      fetchOrders()
    } catch (error) {
      console.error('Error creating purchase order:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn hàng')
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value)
  }

  const getStatusBadge = (status) => {
    const colors = {
      received: 'bg-green-100 text-green-800 border-green-200',
      partial: 'bg-blue-100 text-blue-800 border-blue-200',
      confirmed: 'bg-purple-100 text-purple-800 border-purple-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    const texts = {
      received: 'Đã nhận',
      partial: 'Nhận một phần',
      confirmed: 'Đã xác nhận',
      cancelled: 'Đã hủy',
      pending: 'Chờ xác nhận'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || colors.pending}`}>
        {texts[status] || texts.pending}
      </span>
    )
  }

  const columns = [
    {
      key: 'order_number',
      header: 'Mã đơn',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-primary-600">{row.order_number}</span>
      )
    },
    {
      key: 'supplier_name',
      header: 'Nhà cung cấp',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.supplier_name || '-'}</div>
          {row.contact_name && (
            <div className="text-xs text-gray-500">{row.contact_name}</div>
          )}
        </div>
      )
    },
    {
      key: 'total_amount',
      header: 'Tổng tiền',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-gray-900">{formatCurrency(row.total_amount)}</span>
      )
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      render: (row) => getStatusBadge(row.status)
    },
    {
      key: 'expected_date',
      header: 'Ngày dự kiến',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.expected_date ? format(new Date(row.expected_date), 'dd/MM/yyyy') : '-'}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Ngày tạo',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {format(new Date(row.created_at), 'dd/MM/yyyy')}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Thao tác',
      sortable: false,
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewDetails(row)}
        >
          <Eye className="w-4 h-4 mr-1" />
          Chi tiết
        </Button>
      )
    }
  ]

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <SkeletonTable rows={10} cols={7} />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Đơn đặt hàng</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Quản lý đơn đặt hàng từ nhà cung cấp</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="partial">Nhận một phần</option>
            <option value="received">Đã nhận</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <Button
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Đặt hàng
          </Button>
        </div>
      </div>

      <DataTable
        data={orders}
        columns={columns}
        loading={loading}
        searchable={true}
        pagination={true}
        pageSize={20}
        onRowClick={handleViewDetails}
        emptyMessage="Chưa có đơn đặt hàng nào"
      />

      {/* Order Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedOrder(null)
        }}
        title={`Chi tiết đơn đặt: ${selectedOrder?.order_number}`}
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Nhà cung cấp</p>
                <p className="font-semibold">{selectedOrder.supplier_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                {getStatusBadge(selectedOrder.status)}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-gray-900">Sản phẩm</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đã nhận</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.received_quantity || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Tổng cộng:</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(selectedOrder.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {selectedOrder.status !== 'received' && selectedOrder.status !== 'cancelled' && (
              <Button
                onClick={handleReceive}
                className="w-full"
              >
                <Package className="w-5 h-5 mr-2" />
                Nhận hàng
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Create Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setFormData({
            supplier_id: '',
            items: [{ product_id: '', quantity: 1, unit_price: 0 }],
            expected_date: '',
            notes: ''
          })
        }}
        title="Tạo đơn đặt hàng"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nhà cung cấp *</label>
            <select
              required
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Chọn nhà cung cấp</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ngày dự kiến nhận hàng</label>
            <input
              type="date"
              value={formData.expected_date}
              onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sản phẩm *</label>
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => {
                        const newItems = [...formData.items]
                        newItems[index].product_id = e.target.value
                        const product = products.find(p => p.id === parseInt(e.target.value))
                        if (product && product.cost_price) {
                          newItems[index].unit_price = product.cost_price
                        }
                        setFormData({ ...formData, items: newItems })
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Chọn sản phẩm</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...formData.items]
                        newItems[index].quantity = parseInt(e.target.value) || 1
                        setFormData({ ...formData, items: newItems })
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="SL"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => {
                        const newItems = [...formData.items]
                        newItems[index].unit_price = parseFloat(e.target.value) || 0
                        setFormData({ ...formData, items: newItems })
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Giá"
                    />
                  </div>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          items: formData.items.filter((_, i) => i !== index)
                        })
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    items: [...formData.items, { product_id: '', quantity: 1, unit_price: 0 }]
                  })
                }}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Thêm sản phẩm
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows="3"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                setFormData({
                  supplier_id: '',
                  items: [{ product_id: '', quantity: 1, unit_price: 0 }],
                  expected_date: '',
                  notes: ''
                })
              }}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Tạo đơn hàng
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default PurchaseOrders

