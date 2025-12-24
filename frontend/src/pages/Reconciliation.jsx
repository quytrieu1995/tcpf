import { useEffect, useState } from 'react'
import api from '../config/api'
import { Plus, Eye, FileText, Download, Check, X, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'

const Reconciliation = () => {
  const toast = useToast()
  const [reconciliations, setReconciliations] = useState([])
  const [carriers, setCarriers] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedReconciliation, setSelectedReconciliation] = useState(null)
  const [formData, setFormData] = useState({
    type: 'carrier',
    partner_id: '',
    partner_name: '',
    partner_type: '',
    period_start: '',
    period_end: '',
    notes: ''
  })

  useEffect(() => {
    fetchReconciliations()
    fetchAvailablePartners()
  }, [])

  const fetchReconciliations = async () => {
    try {
      setLoading(true)
      const response = await api.get('/reconciliation?limit=1000')
      setReconciliations(response.data.reconciliations || [])
    } catch (error) {
      console.error('Error fetching reconciliations:', error)
      toast.error('Không thể tải danh sách đối soát')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailablePartners = async (type = null) => {
    try {
      const fetchType = type || formData.type
      const response = await api.get(`/reconciliation/partners/available?type=${fetchType}`)
      if (response.data.carriers) {
        setCarriers(response.data.carriers || [])
        setPlatforms(response.data.platforms || [])
      } else {
        // If single type response
        if (fetchType === 'carrier') {
          setCarriers(response.data || [])
        } else if (fetchType === 'platform') {
          setPlatforms(response.data || [])
        }
      }
    } catch (error) {
      console.error('Error fetching partners:', error)
    }
  }

  const handleTypeChange = (type) => {
    setFormData({ ...formData, type, partner_id: '', partner_name: '' })
    fetchAvailablePartners(type)
  }

  const handlePartnerChange = (partnerId) => {
    const partner = formData.type === 'carrier' 
      ? carriers.find(c => c.id === partnerId)
      : platforms.find(p => p.id === partnerId)
    
    setFormData({ 
      ...formData, 
      partner_id: partnerId,
      partner_name: partner?.name || '',
      partner_type: formData.type === 'carrier' ? 'carrier' : 'platform'
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!formData.period_start || !formData.period_end) {
        toast.error('Vui lòng chọn kỳ đối soát')
        return
      }
      if (!formData.partner_id) {
        toast.error('Vui lòng chọn đối tác')
        return
      }

      await api.post('/reconciliation', formData)
      toast.success('Tạo đối soát thành công!')
      setShowModal(false)
      resetForm()
      fetchReconciliations()
    } catch (error) {
      console.error('Error creating reconciliation:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleViewDetails = async (reconciliation) => {
    try {
      const response = await api.get(`/reconciliation/${reconciliation.id}`)
      setSelectedReconciliation(response.data)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error fetching details:', error)
      toast.error('Không thể tải chi tiết')
    }
  }

  const handleStatusChange = async (reconciliationId, newStatus) => {
    try {
      await api.put(`/reconciliation/${reconciliationId}`, { status: newStatus })
      toast.success('Cập nhật trạng thái thành công!')
      fetchReconciliations()
      if (selectedReconciliation?.id === reconciliationId) {
        const updated = await api.get(`/reconciliation/${reconciliationId}`)
        setSelectedReconciliation(updated.data)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Có lỗi xảy ra khi cập nhật trạng thái')
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'carrier',
      partner_id: '',
      partner_name: '',
      partner_type: '',
      period_start: '',
      period_end: '',
      notes: ''
    })
  }

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      paid: 'bg-purple-100 text-purple-800 border-purple-200'
    }
    const texts = {
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      approved: 'Đã duyệt',
      rejected: 'Đã từ chối',
      paid: 'Đã thanh toán'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || colors.pending}`}>
        {texts[status] || status}
      </span>
    )
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0)
  }

  const columns = [
    {
      key: 'reconciliation_code',
      header: 'Mã đối soát',
      render: (row) => (
        <div className="flex items-center">
          <FileText className="w-5 h-5 text-gray-400 mr-2" />
          <span className="font-semibold text-primary-600">{row.reconciliation_code}</span>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Loại',
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          row.type === 'carrier' 
            ? 'bg-blue-100 text-blue-800 border-blue-200' 
            : 'bg-green-100 text-green-800 border-green-200'
        }`}>
          {row.type === 'carrier' ? 'Vận chuyển' : 'Sàn TMĐT'}
        </span>
      )
    },
    {
      key: 'partner_name',
      header: 'Đối tác',
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">{row.partner_name || '-'}</span>
      )
    },
    {
      key: 'period',
      header: 'Kỳ đối soát',
      render: (row) => (
        <div className="text-sm text-gray-600">
          <div>{format(new Date(row.period_start), 'dd/MM/yyyy')}</div>
          <div className="text-xs text-gray-400">đến {format(new Date(row.period_end), 'dd/MM/yyyy')}</div>
        </div>
      )
    },
    {
      key: 'total_orders',
      header: 'Số đơn',
      render: (row) => (
        <span className="text-sm font-medium">{row.total_orders || 0}</span>
      )
    },
    {
      key: 'net_amount',
      header: 'Số tiền',
      render: (row) => (
        <span className="text-sm font-semibold text-green-600">{formatCurrency(row.net_amount)}</span>
      )
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => getStatusBadge(row.status)
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
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Đối soát</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Đối soát với đơn vị vận chuyển và sàn thương mại điện tử</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo đối soát
        </Button>
      </div>

      <DataTable
        data={reconciliations}
        columns={columns}
        loading={loading}
        searchable={true}
        pagination={true}
        pageSize={20}
        emptyMessage="Chưa có đối soát nào"
      />

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        title="Tạo đối soát mới"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại đối soát <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="carrier">Đối soát với đơn vị vận chuyển</option>
              <option value="platform">Đối soát với sàn TMĐT</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đối tác <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.partner_id}
              onChange={(e) => handlePartnerChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Chọn đối tác</option>
              {formData.type === 'carrier' ? (
                carriers.map(partner => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))
              ) : (
                platforms.map(partner => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                min={formData.period_start}
                required
              />
            </div>
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
              Tạo đối soát
            </Button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedReconciliation(null) }}
        title={`Chi tiết đối soát: ${selectedReconciliation?.reconciliation_code}`}
        size="xl"
      >
        {selectedReconciliation && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Loại</p>
                  <p className="font-semibold">
                    {selectedReconciliation.type === 'carrier' ? 'Vận chuyển' : 'Sàn TMĐT'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Đối tác</p>
                  <p className="font-semibold">{selectedReconciliation.partner_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Kỳ đối soát</p>
                  <p className="font-semibold">
                    {format(new Date(selectedReconciliation.period_start), 'dd/MM/yyyy')} - {format(new Date(selectedReconciliation.period_end), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                  {getStatusBadge(selectedReconciliation.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tổng số đơn</p>
                  <p className="text-lg font-bold">{selectedReconciliation.total_orders || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tổng tiền hàng</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedReconciliation.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tổng phí vận chuyển</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedReconciliation.total_shipping_fee)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Số tiền đối soát</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedReconciliation.net_amount)}</p>
                </div>
              </div>
            </div>

            {/* Status Actions */}
            {selectedReconciliation.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange(selectedReconciliation.id, 'confirmed')}
                  className="text-blue-600 border-blue-600"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Xác nhận
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange(selectedReconciliation.id, 'rejected')}
                  className="text-red-600 border-red-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  Từ chối
                </Button>
              </div>
            )}

            {selectedReconciliation.status === 'confirmed' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange(selectedReconciliation.id, 'approved')}
                  className="text-green-600 border-green-600"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Duyệt
                </Button>
              </div>
            )}

            {selectedReconciliation.status === 'approved' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange(selectedReconciliation.id, 'paid')}
                  className="text-purple-600 border-purple-600"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Đánh dấu đã thanh toán
                </Button>
              </div>
            )}

            {/* Items Table */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Chi tiết đơn hàng</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã đơn</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã vận đơn</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tiền hàng</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Phí ship</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">COD</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedReconciliation.items && selectedReconciliation.items.length > 0 ? (
                      selectedReconciliation.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.order_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.tracking_number || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.customer_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(item.order_amount)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(item.shipping_fee)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(item.cod_amount)}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{formatCurrency(item.net_amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500">
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Reconciliation

