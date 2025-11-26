import { useEffect, useState } from 'react'
import axios from 'axios'
import { Plus, Eye, Package, Truck, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'

const Shipments = () => {
  const toast = useToast()
  const [shipments, setShipments] = useState([])
  const [orders, setOrders] = useState([])
  const [carriers, setCarriers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [formData, setFormData] = useState({
    order_id: '',
    carrier_id: '',
    tracking_number: '',
    notes: '',
    estimated_delivery_date: ''
  })

  useEffect(() => {
    fetchShipments()
    fetchCarriers()
    fetchOrders()
  }, [])

  const fetchShipments = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/shipments?limit=1000')
      setShipments(response.data.shipments || [])
    } catch (error) {
      console.error('Error fetching shipments:', error)
      toast.error('Không thể tải danh sách vận đơn')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/orders?limit=1000')
      setOrders(response.data.orders || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const fetchCarriers = async () => {
    try {
      const response = await axios.get('/api/shipping?active_only=true')
      // Ensure response.data is an array
      if (Array.isArray(response.data)) {
        setCarriers(response.data)
      } else {
        setCarriers([])
        console.warn('Carriers response is not an array:', response.data)
      }
    } catch (error) {
      console.error('Error fetching carriers:', error)
      setCarriers([]) // Set empty array on error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/shipments', formData)
      toast.success('Tạo vận đơn thành công!')
      setShowModal(false)
      resetForm()
      fetchShipments()
    } catch (error) {
      console.error('Error creating shipment:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleViewDetails = async (shipment) => {
    try {
      const response = await axios.get(`/api/shipments/${shipment.id}`)
      setSelectedShipment(response.data)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error fetching details:', error)
      toast.error('Không thể tải chi tiết')
    }
  }

  const handleStatusChange = async (shipmentId, newStatus) => {
    try {
      await axios.patch(`/api/shipments/${shipmentId}/status`, { 
        status: newStatus,
        delivered_at: newStatus === 'delivered' ? new Date().toISOString() : null
      })
      toast.success('Cập nhật trạng thái thành công!')
      fetchShipments()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Có lỗi xảy ra khi cập nhật trạng thái')
    }
  }

  const handleSyncShipment = async (shipmentId) => {
    try {
      const response = await axios.post(`/api/shipments/${shipmentId}/sync`)
      toast.success('Đồng bộ trạng thái thành công!')
      fetchShipments()
      if (selectedShipment?.id === shipmentId) {
        const updated = await axios.get(`/api/shipments/${shipmentId}`)
        setSelectedShipment(updated.data)
      }
    } catch (error) {
      console.error('Error syncing shipment:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đồng bộ')
    }
  }

  const resetForm = () => {
    setFormData({
      order_id: '',
      carrier_id: '',
      tracking_number: '',
      notes: '',
      estimated_delivery_date: ''
    })
  }

  const getStatusBadge = (status) => {
    const colors = {
      delivered: 'bg-green-100 text-green-800 border-green-200',
      in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    const texts = {
      delivered: 'Đã giao',
      in_transit: 'Đang vận chuyển',
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
      key: 'tracking_number',
      header: 'Mã vận đơn',
      render: (row) => (
        <div className="flex items-center">
          <Package className="w-5 h-5 text-gray-400 mr-2" />
          <span className="font-semibold text-primary-600">{row.tracking_number}</span>
        </div>
      )
    },
    {
      key: 'order_number',
      header: 'Mã đơn hàng',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.order_number || '-'}</span>
      )
    },
    {
      key: 'customer_name',
      header: 'Khách hàng',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.customer_name || '-'}</div>
          {row.customer_phone && (
            <div className="text-xs text-gray-500">{row.customer_phone}</div>
          )}
        </div>
      )
    },
    {
      key: 'carrier_name',
      header: 'Đơn vị vận chuyển',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.carrier_name || '-'}</span>
      )
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <select
          value={row.status}
          onChange={(e) => handleStatusChange(row.id, e.target.value)}
          className={`text-xs font-semibold rounded-full px-3 py-1 border-0 cursor-pointer ${
            row.status === 'delivered' ? 'bg-green-100 text-green-800' :
            row.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
            row.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}
        >
          <option value="pending">Chờ xử lý</option>
          <option value="in_transit">Đang vận chuyển</option>
          <option value="delivered">Đã giao</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      )
    },
    {
      key: 'created_at',
      header: 'Ngày tạo',
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
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row)}
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4 mr-1" />
            Chi tiết
          </Button>
          {row.carrier_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSyncShipment(row.id)}
              title="Đồng bộ từ API"
              className="text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quản lý vận đơn</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Theo dõi và quản lý vận đơn giao hàng</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo vận đơn
        </Button>
      </div>

      <DataTable
        data={shipments}
        columns={columns}
        loading={loading}
        searchable={true}
        pagination={true}
        pageSize={20}
        emptyMessage="Chưa có vận đơn nào"
      />

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        title="Tạo vận đơn mới"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đơn hàng <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.order_id}
              onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Chọn đơn hàng</option>
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  {order.order_number} - {order.customer_name || 'Khách vãng lai'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đơn vị vận chuyển <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.carrier_id}
              onChange={(e) => setFormData({ ...formData, carrier_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Chọn đơn vị vận chuyển</option>
              {carriers.map(carrier => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã vận đơn <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.tracking_number}
              onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
              placeholder="Nhập mã vận đơn"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày giao dự kiến
            </label>
            <Input
              type="date"
              value={formData.estimated_delivery_date}
              onChange={(e) => setFormData({ ...formData, estimated_delivery_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowModal(false); resetForm() }}
            >
              Hủy
            </Button>
            <Button type="submit">
              Tạo vận đơn
            </Button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedShipment(null) }}
        title={`Chi tiết vận đơn: ${selectedShipment?.tracking_number}`}
        size="lg"
      >
        {selectedShipment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Mã đơn hàng</p>
                <p className="font-semibold">{selectedShipment.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                {getStatusBadge(selectedShipment.status)}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Đơn vị vận chuyển</p>
                <p className="font-semibold">{selectedShipment.carrier_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Mã vận đơn</p>
                <p className="font-semibold text-primary-600">{selectedShipment.tracking_number}</p>
              </div>
              {selectedShipment.estimated_delivery_date && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Ngày giao dự kiến</p>
                  <p className="font-semibold">{format(new Date(selectedShipment.estimated_delivery_date), 'dd/MM/yyyy')}</p>
                </div>
              )}
              {selectedShipment.delivered_at && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Ngày giao thực tế</p>
                  <p className="font-semibold">{format(new Date(selectedShipment.delivered_at), 'dd/MM/yyyy HH:mm')}</p>
                </div>
              )}
            </div>
            {selectedShipment.customer_name && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Khách hàng</p>
                <p className="font-semibold">{selectedShipment.customer_name}</p>
                {selectedShipment.customer_phone && (
                  <p className="text-sm text-gray-600">{selectedShipment.customer_phone}</p>
                )}
                {selectedShipment.customer_address && (
                  <p className="text-sm text-gray-600">{selectedShipment.customer_address}</p>
                )}
              </div>
            )}
            {selectedShipment.notes && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Ghi chú</p>
                <p className="text-sm text-gray-900">{selectedShipment.notes}</p>
              </div>
            )}
            {selectedShipment.carrier_status && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Trạng thái từ đơn vị vận chuyển</p>
                <p className="text-sm font-semibold text-gray-900">{selectedShipment.carrier_status}</p>
                {selectedShipment.carrier_status_message && (
                  <p className="text-xs text-gray-600 mt-1">{selectedShipment.carrier_status_message}</p>
                )}
              </div>
            )}
            {selectedShipment.tracking_events && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Lịch sử vận chuyển</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(() => {
                    let events = selectedShipment.tracking_events;
                    if (typeof events === 'string') {
                      try {
                        events = JSON.parse(events);
                      } catch (e) {
                        events = [];
                      }
                    }
                    return Array.isArray(events) && events.length > 0 ? (
                      events.map((event, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                          <div className="font-medium">{event.status || event.description || event.message || 'Cập nhật trạng thái'}</div>
                          {event.time && (
                            <div className="text-gray-500">{format(new Date(event.time), 'dd/MM/yyyy HH:mm')}</div>
                          )}
                          {event.location && (
                            <div className="text-gray-400">{event.location}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">Chưa có lịch sử vận chuyển</div>
                    );
                  })()}
                </div>
              </div>
            )}
            {selectedShipment.last_synced_at && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Lần đồng bộ cuối</p>
                <p className="text-sm text-gray-600">{format(new Date(selectedShipment.last_synced_at), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Shipments

