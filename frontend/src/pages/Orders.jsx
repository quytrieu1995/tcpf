import { useEffect, useState } from 'react'
import axios from 'axios'
import { Eye, Download, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'

const Orders = () => {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const url = `/api/orders?status=${statusFilter}&limit=1000`
      const response = await axios.get(url)
      setOrders(response.data.orders)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Không thể tải danh sách đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status: newStatus })
      toast.success('Cập nhật trạng thái thành công!')
      fetchOrders()
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Có lỗi xảy ra khi cập nhật trạng thái')
    }
  }

  const handleViewDetails = async (order) => {
    try {
      const response = await axios.get(`/api/orders/${order.id}`)
      setSelectedOrder(response.data)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error fetching order details:', error)
      toast.error('Không thể tải chi tiết đơn hàng')
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
      completed: 'bg-green-100 text-green-800 border-green-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    const texts = {
      completed: 'Hoàn thành',
      processing: 'Đang xử lý',
      cancelled: 'Đã hủy',
      pending: 'Chờ xử lý'
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
      header: 'Mã đơn hàng',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-primary-600">{row.order_number}</span>
      )
    },
    {
      key: 'customer_name',
      header: 'Khách hàng',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.customer_name || 'Khách vãng lai'}</div>
          {row.customer_email && (
            <div className="text-xs text-gray-500">{row.customer_email}</div>
          )}
        </div>
      )
    },
    {
      key: 'total_amount',
      header: 'Tổng tiền',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-gray-900">{formatCurrency(row.total_amount)}</div>
          {row.discount_amount > 0 && (
            <div className="text-xs text-green-600">Giảm: {formatCurrency(row.discount_amount)}</div>
          )}
        </div>
      )
    },
    {
      key: 'payment_method',
      header: 'Thanh toán',
      render: (row) => {
        const methods = {
          cash: 'Tiền mặt',
          bank_transfer: 'Chuyển khoản',
          credit: 'Trả chậm',
          card: 'Thẻ'
        }
        return (
          <span className="text-sm text-gray-600">
            {methods[row.payment_method] || row.payment_method || '-'}
          </span>
        )
      }
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      render: (row) => (
        <select
          value={row.status}
          onChange={(e) => handleStatusChange(row.id, e.target.value)}
          className={`text-xs font-semibold rounded-full px-3 py-1 border-0 cursor-pointer ${
            row.status === 'completed' ? 'bg-green-100 text-green-800' :
            row.status === 'processing' ? 'bg-blue-100 text-blue-800' :
            row.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}
        >
          <option value="pending">Chờ xử lý</option>
          <option value="processing">Đang xử lý</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      )
    },
    {
      key: 'created_at',
      header: 'Ngày tạo',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-600">
          <div>{format(new Date(row.created_at), 'dd/MM/yyyy')}</div>
          <div className="text-xs text-gray-400">{format(new Date(row.created_at), 'HH:mm')}</div>
        </div>
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quản lý đơn hàng</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Theo dõi và quản lý tất cả đơn hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="processing">Đang xử lý</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <Button
            variant="outline"
            onClick={fetchOrders}
          >
            <Download className="w-4 h-4 mr-2" />
            Xuất Excel
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
        emptyMessage="Chưa có đơn hàng nào"
      />

      {/* Order Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedOrder(null)
        }}
        title={`Chi tiết đơn hàng: ${selectedOrder?.order_number}`}
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Khách hàng</p>
                <p className="font-semibold">{selectedOrder.customer_name || 'Khách vãng lai'}</p>
                {selectedOrder.customer_email && (
                  <p className="text-sm text-gray-600">{selectedOrder.customer_email}</p>
                )}
                {selectedOrder.customer_phone && (
                  <p className="text-sm text-gray-600">{selectedOrder.customer_phone}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                {getStatusBadge(selectedOrder.status)}
                <p className="text-sm text-gray-500 mt-2 mb-1">Thanh toán</p>
                <p className="font-semibold">{selectedOrder.payment_method || '-'}</p>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Tổng cộng:</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(selectedOrder.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {selectedOrder.shipping_address && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Địa chỉ giao hàng</p>
                <p className="text-sm text-gray-900">{selectedOrder.shipping_address}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Orders
