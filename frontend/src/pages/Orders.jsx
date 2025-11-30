import { useEffect, useState } from 'react'
import api from '../config/api'
import { Eye, Download, Filter, X, Edit, Save, ShoppingCart, Truck, CheckCircle, Clock } from 'lucide-react'
import AddressAutocomplete from '../components/AddressAutocomplete'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'

const Orders = () => {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [users, setUsers] = useState([])
  const [editFormData, setEditFormData] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchOrders()
    fetchUsers()
  }, [statusFilter, deliveryStatusFilter, startDate, endDate, searchTerm])

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users')
      setUsers(response.data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      let url = `/orders?limit=1000`
      if (statusFilter) url += `&status=${statusFilter}`
      if (deliveryStatusFilter) url += `&delivery_status=${deliveryStatusFilter}`
      if (startDate) url += `&start_date=${startDate}`
      if (endDate) url += `&end_date=${endDate}`
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`
      
      const response = await api.get(url)
      setOrders(response.data.orders || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Không thể tải danh sách đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    try {
      const exportData = orders.map(order => ({
        'Mã hóa đơn': order.order_number || '',
        'Mã vận đơn': order.tracking_number || '',
        'Trạng thái giao hàng': getDeliveryStatusText(order.delivery_status),
        'Mã đối soát': order.reconciliation_code || '',
        'Thời gian': format(new Date(order.created_at), 'dd/MM/yyyy HH:mm'),
        'Thời gian tạo': format(new Date(order.created_at), 'dd/MM/yyyy HH:mm'),
        'Ngày cập nhật': order.updated_at ? format(new Date(order.updated_at), 'dd/MM/yyyy HH:mm') : '',
        'Mã đặt hàng': order.order_number || '',
        'Mã trả hàng': order.return_code || '',
        'Mã KH': order.customer_id || '',
        'Khách hàng': order.customer_name || 'Khách vãng lai',
        'Email': order.customer_email || '',
        'Điện thoại': order.customer_phone || '',
        'Địa chỉ': order.shipping_address || order.customer_address || '',
        'Khu vực': order.area || '',
        'Phường/Xã': order.ward || '',
        'Ngày sinh': '', // Customer DOB not in order table
        'Chi nhánh': order.branch_id || '',
        'Người bán': order.seller_name || '',
        'Người tạo': order.creator_name || '',
        'Kênh bán': order.sales_channel || '',
        'Đối tác giao hàng': '', // Will be from shipping_method
        'Ghi chú': order.notes || '',
        'Tổng tiền hàng': order.total_amount || 0,
        'Tổng tiền hàng sau thuế': order.total_after_tax || order.total_amount || 0,
        'Giảm giá': order.discount_amount || 0,
        'Tổng sau giảm giá': (order.total_amount || 0) - (order.discount_amount || 0),
        'VAT': order.vat || 0,
        'Giảm thuế': order.tax_reduction || 0,
        'Thu khác': order.other_income || 0,
        'Khách cần trả': order.total_amount || 0,
        'Khách đã trả': order.customer_paid || 0,
        'Chiết khấu thanh toán': order.payment_discount || 0,
        'Còn cần thu (COD)': order.cod_amount || 0,
        'Phí trả ĐTGH': order.return_fee || 0,
        'Ghi chú trạng thái giao hàng': order.delivery_status_notes || '',
        'Thời gian giao hàng': order.delivered_at ? format(new Date(order.delivered_at), 'dd/MM/yyyy HH:mm') : '',
        'Trạng thái': getStatusText(order.status)
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng')

      const colWidths = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }))
      ws['!cols'] = colWidths

      let filename = 'DonHang'
      if (startDate || endDate) {
        const dateStr = startDate && endDate 
          ? `${startDate}_${endDate}`
          : startDate 
          ? `tu_${startDate}`
          : `den_${endDate}`
        filename += `_${dateStr}`
      }
      filename += `_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`

      XLSX.writeFile(wb, filename)
      toast.success('Xuất Excel thành công!')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      toast.error('Có lỗi xảy ra khi xuất Excel')
    }
  }

  const clearFilters = () => {
    setStatusFilter('')
    setDeliveryStatusFilter('')
    setStartDate('')
    setEndDate('')
    setSearchTerm('')
  }

  const hasActiveFilters = statusFilter || deliveryStatusFilter || startDate || endDate || searchTerm

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus })
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
      const response = await api.get(`/orders/${order.id}`)
      setSelectedOrder(response.data)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error fetching order details:', error)
      toast.error('Không thể tải chi tiết đơn hàng')
    }
  }

  const handleEdit = (order) => {
    setSelectedOrder(order)
    setEditFormData({
      return_code: order.return_code || '',
      reconciliation_code: order.reconciliation_code || '',
      delivery_status: order.delivery_status || 'pending',
      area: order.area || '',
      ward: order.ward || '',
      branch_id: order.branch_id || '',
      seller_id: order.seller_id || '',
      sales_channel: order.sales_channel || '',
      total_after_tax: order.total_after_tax || order.total_amount || '',
      vat: order.vat || '',
      tax_reduction: order.tax_reduction || '',
      other_income: order.other_income || '',
      customer_paid: order.customer_paid || '',
      payment_discount: order.payment_discount || '',
      cod_amount: order.cod_amount || '',
      return_fee: order.return_fee || '',
      delivery_status_notes: order.delivery_status_notes || '',
      delivered_at: order.delivered_at ? format(new Date(order.delivered_at), "yyyy-MM-dd'T'HH:mm") : '',
      tracking_number: order.tracking_number || '',
      shipping_address: order.shipping_address || '',
      shipping_phone: order.shipping_phone || '',
      notes: order.notes || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateOrder = async (e) => {
    e.preventDefault()
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      await api.put(`/orders/${selectedOrder.id}`, editFormData)
      toast.success('Cập nhật đơn hàng thành công!')
      setShowEditModal(false)
      fetchOrders()
      if (showDetailsModal) {
        handleViewDetails({ id: selectedOrder.id })
      }
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật đơn hàng')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (value) => {
    if (!value) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value)
  }

  const getStatusText = (status) => {
    const texts = {
      completed: 'Hoàn thành',
      processing: 'Đang xử lý',
      cancelled: 'Đã hủy',
      pending: 'Chờ xử lý'
    }
    return texts[status] || texts.pending
  }

  const getDeliveryStatusText = (status) => {
    const texts = {
      pending: 'Chờ giao',
      shipping: 'Đang giao',
      delivered: 'Đã giao',
      returned: 'Đã trả',
      cancelled: 'Đã hủy'
    }
    return texts[status] || texts.pending
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

  const getSalesChannelBadge = (channel) => {
    if (!channel) return null
    const channelConfig = {
      'shopee': { icon: ShoppingCart, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Shopee' },
      'tiktok': { icon: ShoppingCart, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'TikTok' },
      'lazada': { icon: ShoppingCart, color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Lazada' },
      'tiki': { icon: ShoppingCart, color: 'bg-red-100 text-red-800 border-red-200', label: 'Tiki' },
      'offline': { icon: ShoppingCart, color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Offline' }
    }
    const config = channelConfig[channel.toLowerCase()] || { icon: ShoppingCart, color: 'bg-gray-100 text-gray-800 border-gray-200', label: channel }
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const getShippingPartnerBadge = (partner) => {
    if (!partner) return null
    const partnerConfig = {
      'ghn': { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'GHN' },
      'viettel post': { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Viettel Post' },
      'ghtk': { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'GHTK' },
      'j&t': { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'J&T' }
    }
    const config = partnerConfig[partner.toLowerCase()] || { color: 'bg-gray-100 text-gray-800 border-gray-200', label: partner }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Truck className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const getDeliveryStatusBadge = (status) => {
    const statusConfig = {
      'delivered': { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Đã giao' },
      'shipping': { icon: Truck, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Đang giao' },
      'pending': { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Đang xử lý' },
      'returned': { icon: X, color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Đã trả' },
      'cancelled': { icon: X, color: 'bg-red-100 text-red-800 border-red-200', label: 'Đã hủy' }
    }
    const config = statusConfig[status] || statusConfig['pending']
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const columns = [
    {
      key: 'tracking_number',
      header: 'MÃ VẬN ĐƠN',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-primary-600">{row.tracking_number || row.order_number || '-'}</span>
      )
    },
    {
      key: 'customer_name',
      header: 'KHÁCH HÀNG',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.customer_name || 'Khách vãng lai'}</div>
          {row.customer_code && (
            <div className="text-xs text-gray-500">{row.customer_code}</div>
          )}
        </div>
      )
    },
    {
      key: 'customer_phone',
      header: 'ĐIỆN THOẠI',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">{row.customer_phone || '-'}</span>
      )
    },
    {
      key: 'branch',
      header: 'CHI NHÁNH',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-600">
          {row.branch_code && row.branch_name ? (
            <span>{row.branch_code} - {row.branch_name}</span>
          ) : row.branch_name ? (
            <span>{row.branch_name}</span>
          ) : (
            <span>-</span>
          )}
        </div>
      )
    },
    {
      key: 'sales_channel',
      header: 'KÊNH BÁN',
      sortable: true,
      render: (row) => getSalesChannelBadge(row.sales_channel)
    },
    {
      key: 'shipping_method',
      header: 'ĐỐI TÁC GH',
      sortable: true,
      render: (row) => getShippingPartnerBadge(row.shipping_method_name)
    },
    {
      key: 'created_at',
      header: 'NGÀY TẠO',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {format(new Date(row.created_at), 'yyyy-MM-dd')}
        </span>
      )
    },
    {
      key: 'total_quantity',
      header: 'SỐ LƯỢNG SP',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">
          {row.total_quantity || 0} SP
        </span>
      )
    },
    {
      key: 'total_amount',
      header: 'TỔNG TIỀN',
      sortable: true,
      render: (row) => (
        <div className="font-semibold text-gray-900">{formatCurrency(row.total_amount)}</div>
      )
    },
    {
      key: 'delivery_status',
      header: 'TRẠNG THÁI',
      sortable: true,
      render: (row) => getDeliveryStatusBadge(row.delivery_status || row.status)
    },
    {
      key: 'actions',
      header: 'Thao tác',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Chi tiết
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Sửa
          </Button>
        </div>
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
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Button
            variant="outline"
            onClick={() => setShowFilterModal(true)}
            className={hasActiveFilters ? 'border-primary-500 text-primary-600' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Lọc
            {hasActiveFilters && (
              <span className="ml-2 bg-primary-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {[statusFilter, deliveryStatusFilter, startDate, endDate, searchTerm].filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={orders.length === 0}
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
        searchable={false}
        pagination={true}
        pageSize={20}
        onRowClick={handleViewDetails}
        emptyMessage="Chưa có đơn hàng nào"
      />

      {/* Filter Modal */}
      <Modal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Lọc đơn hàng"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="processing">Đang xử lý</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái giao hàng
            </label>
            <select
              value={deliveryStatusFilter}
              onChange={(e) => setDeliveryStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ giao</option>
              <option value="shipping">Đang giao</option>
              <option value="delivered">Đã giao</option>
              <option value="returned">Đã trả</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Bộ lọc đang áp dụng:</span>
              <div className="flex flex-wrap gap-2">
                {statusFilter && (
                  <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs">
                    Trạng thái: {getStatusText(statusFilter)}
                    <button
                      onClick={() => setStatusFilter('')}
                      className="ml-1 hover:text-primary-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {deliveryStatusFilter && (
                  <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs">
                    Giao hàng: {getDeliveryStatusText(deliveryStatusFilter)}
                    <button
                      onClick={() => setDeliveryStatusFilter('')}
                      className="ml-1 hover:text-primary-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {startDate && (
                  <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs">
                    Từ: {format(new Date(startDate), 'dd/MM/yyyy')}
                    <button
                      onClick={() => setStartDate('')}
                      className="ml-1 hover:text-primary-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {endDate && (
                  <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs">
                    Đến: {format(new Date(endDate), 'dd/MM/yyyy')}
                    <button
                      onClick={() => setEndDate('')}
                      className="ml-1 hover:text-primary-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchTerm && (
                  <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs">
                    Tìm: {searchTerm}
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-1 hover:text-primary-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              Xóa bộ lọc
            </Button>
            <Button onClick={() => setShowFilterModal(false)}>
              Áp dụng
            </Button>
          </div>
        </div>
      </Modal>

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
                <p className="text-sm text-gray-500 mt-2 mb-1">Trạng thái giao hàng</p>
                {getDeliveryStatusBadge(selectedOrder.delivery_status)}
                <p className="text-sm text-gray-500 mt-2 mb-1">Thanh toán</p>
                <p className="font-semibold">{selectedOrder.payment_method || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Mã vận đơn</p>
                <p className="text-sm font-semibold">{selectedOrder.tracking_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Mã trả hàng</p>
                <p className="text-sm font-semibold">{selectedOrder.return_code || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Mã đối soát</p>
                <p className="text-sm font-semibold">{selectedOrder.reconciliation_code || '-'}</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tổng tiền hàng</p>
                <p className="text-lg font-semibold">{formatCurrency(selectedOrder.total_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Tổng sau thuế</p>
                <p className="text-lg font-semibold">{formatCurrency(selectedOrder.total_after_tax || selectedOrder.total_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Giảm giá</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedOrder.discount_amount || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Khách đã trả</p>
                <p className="text-lg font-semibold text-blue-600">{formatCurrency(selectedOrder.customer_paid || 0)}</p>
              </div>
            </div>

            {selectedOrder.shipping_address && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Địa chỉ giao hàng</p>
                <p className="text-sm text-gray-900">{selectedOrder.shipping_address}</p>
                {selectedOrder.area && (
                  <p className="text-xs text-gray-500">Khu vực: {selectedOrder.area}</p>
                )}
                {selectedOrder.ward && (
                  <p className="text-xs text-gray-500">Phường/Xã: {selectedOrder.ward}</p>
                )}
              </div>
            )}

            {selectedOrder.delivery_status_notes && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Ghi chú trạng thái giao hàng</p>
                <p className="text-sm text-gray-900">{selectedOrder.delivery_status_notes}</p>
              </div>
            )}

            {selectedOrder.notes && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Ghi chú</p>
                <p className="text-sm text-gray-900">{selectedOrder.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailsModal(false)
                  handleEdit(selectedOrder)
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Chỉnh sửa
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Order Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditFormData({})
        }}
        title={`Chỉnh sửa đơn hàng: ${selectedOrder?.order_number}`}
        size="xl"
      >
        <form onSubmit={handleUpdateOrder} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã vận đơn
              </label>
              <Input
                type="text"
                value={editFormData.tracking_number || ''}
                onChange={(e) => setEditFormData({ ...editFormData, tracking_number: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã trả hàng
              </label>
              <Input
                type="text"
                value={editFormData.return_code || ''}
                onChange={(e) => setEditFormData({ ...editFormData, return_code: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã đối soát
              </label>
              <Input
                type="text"
                value={editFormData.reconciliation_code || ''}
                onChange={(e) => setEditFormData({ ...editFormData, reconciliation_code: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trạng thái giao hàng
              </label>
              <select
                value={editFormData.delivery_status || 'pending'}
                onChange={(e) => setEditFormData({ ...editFormData, delivery_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="pending">Chờ giao</option>
                <option value="shipping">Đang giao</option>
                <option value="delivered">Đã giao</option>
                <option value="returned">Đã trả</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Khu vực
              </label>
              <Input
                type="text"
                value={editFormData.area || ''}
                onChange={(e) => setEditFormData({ ...editFormData, area: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phường/Xã
              </label>
              <Input
                type="text"
                value={editFormData.ward || ''}
                onChange={(e) => setEditFormData({ ...editFormData, ward: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Người bán
              </label>
              <select
                value={editFormData.seller_id || ''}
                onChange={(e) => setEditFormData({ ...editFormData, seller_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Chọn người bán</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kênh bán
              </label>
              <Input
                type="text"
                value={editFormData.sales_channel || ''}
                onChange={(e) => setEditFormData({ ...editFormData, sales_channel: e.target.value })}
                placeholder="online, offline, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tổng tiền hàng sau thuế
              </label>
              <Input
                type="number"
                value={editFormData.total_after_tax || ''}
                onChange={(e) => setEditFormData({ ...editFormData, total_after_tax: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VAT
              </label>
              <Input
                type="number"
                value={editFormData.vat || ''}
                onChange={(e) => setEditFormData({ ...editFormData, vat: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giảm thuế
              </label>
              <Input
                type="number"
                value={editFormData.tax_reduction || ''}
                onChange={(e) => setEditFormData({ ...editFormData, tax_reduction: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thu khác
              </label>
              <Input
                type="number"
                value={editFormData.other_income || ''}
                onChange={(e) => setEditFormData({ ...editFormData, other_income: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Khách đã trả
              </label>
              <Input
                type="number"
                value={editFormData.customer_paid || ''}
                onChange={(e) => setEditFormData({ ...editFormData, customer_paid: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chiết khấu thanh toán
              </label>
              <Input
                type="number"
                value={editFormData.payment_discount || ''}
                onChange={(e) => setEditFormData({ ...editFormData, payment_discount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Còn cần thu (COD)
              </label>
              <Input
                type="number"
                value={editFormData.cod_amount || ''}
                onChange={(e) => setEditFormData({ ...editFormData, cod_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phí trả ĐTGH
              </label>
              <Input
                type="number"
                value={editFormData.return_fee || ''}
                onChange={(e) => setEditFormData({ ...editFormData, return_fee: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Địa chỉ giao hàng
              </label>
              <AddressAutocomplete
                value={editFormData.shipping_address || ''}
                onChange={(address) => setEditFormData({ ...editFormData, shipping_address: address })}
                onAddressChange={(addressData) => {
                  setEditFormData({ 
                    ...editFormData, 
                    shipping_address: addressData.fullAddress,
                    area: addressData.district,
                    ward: addressData.ward
                  })
                }}
                placeholder="Nhập địa chỉ giao hàng"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại
              </label>
              <Input
                type="tel"
                value={editFormData.shipping_phone || ''}
                onChange={(e) => setEditFormData({ ...editFormData, shipping_phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian giao hàng
              </label>
              <Input
                type="datetime-local"
                value={editFormData.delivered_at || ''}
                onChange={(e) => setEditFormData({ ...editFormData, delivered_at: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú trạng thái giao hàng
              </label>
              <textarea
                value={editFormData.delivery_status_notes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, delivery_status_notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú
              </label>
              <textarea
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditModal(false)
                setEditFormData({})
              }}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Orders
