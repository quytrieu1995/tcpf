import { useEffect, useState } from 'react'
import api from '../config/api'
import { Plus, Eye, FileText, Download, Check, X, Clock, Upload, AlertCircle } from 'lucide-react'
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
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showUploadDetailsModal, setShowUploadDetailsModal] = useState(false)
  const [selectedUpload, setSelectedUpload] = useState(null)
  const [uploads, setUploads] = useState([])
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    type: 'carrier',
    partner_id: '',
    partner_name: '',
    partner_type: '',
    period_start: '',
    period_end: '',
    notes: ''
  })
  const [uploadFormData, setUploadFormData] = useState({
    reconciliation_id: '',
    upload_type: 'carrier',
    partner_id: '',
    partner_name: '',
    period_start: '',
    period_end: ''
  })

  useEffect(() => {
    fetchReconciliations()
    fetchAvailablePartners()
    fetchUploads()
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

  const fetchUploads = async () => {
    try {
      const response = await api.get('/reconciliation-upload/uploads?limit=100')
      setUploads(response.data.uploads || [])
    } catch (error) {
      console.error('Error fetching uploads:', error)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                           'application/vnd.ms-excel', 
                           'text/csv']
      const allowedExts = ['.xlsx', '.xls', '.csv']
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      
      if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
        toast.error('Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc CSV')
        return
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File không được vượt quá 10MB')
        return
      }
      
      setUploadFile(file)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Vui lòng chọn file để upload')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('reconciliation_id', uploadFormData.reconciliation_id || '')
      formData.append('upload_type', uploadFormData.upload_type)
      formData.append('partner_id', uploadFormData.partner_id || '')
      formData.append('partner_name', uploadFormData.partner_name || '')
      formData.append('period_start', uploadFormData.period_start || '')
      formData.append('period_end', uploadFormData.period_end || '')

      await api.post('/reconciliation-upload/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      toast.success('File đã được upload và đang được xử lý!')
      setShowUploadModal(false)
      setUploadFile(null)
      setUploadFormData({
        reconciliation_id: '',
        upload_type: 'carrier',
        partner_id: '',
        partner_name: '',
        period_start: '',
        period_end: ''
      })
      
      // Refresh after a delay to allow processing
      setTimeout(() => {
        fetchUploads()
        fetchReconciliations()
      }, 2000)
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleViewUploadDetails = async (upload) => {
    try {
      const response = await api.get(`/reconciliation-upload/uploads/${upload.id}`)
      setSelectedUpload(response.data)
      setShowUploadDetailsModal(true)
    } catch (error) {
      console.error('Error fetching upload details:', error)
      toast.error('Không thể tải chi tiết')
    }
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
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => { setShowUploadModal(true) }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload file đối soát
          </Button>
          <Button onClick={() => { resetForm(); setShowModal(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo đối soát
          </Button>
        </div>
      </div>

      {/* Uploads Section */}
      {uploads.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lịch sử upload file</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Khớp / Tổng</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Chênh lệch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày upload</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploads.slice(0, 5).map((upload) => (
                  <tr key={upload.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{upload.file_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {upload.upload_type === 'carrier' ? 'Vận chuyển' : 'Sàn TMĐT'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        upload.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                        upload.status === 'processing' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        upload.status === 'failed' ? 'bg-red-100 text-red-800 border-red-200' :
                        'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}>
                        {upload.status === 'completed' ? 'Hoàn thành' :
                         upload.status === 'processing' ? 'Đang xử lý' :
                         upload.status === 'failed' ? 'Lỗi' : 'Chờ xử lý'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      <span className={upload.matched_records === upload.total_records ? 'text-green-600 font-semibold' : ''}>
                        {upload.matched_records || 0} / {upload.total_records || 0}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${(upload.difference_amount || 0) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(upload.difference_amount || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(upload.created_at), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewUploadDetails(upload)}
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Upload File Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => { setShowUploadModal(false); setUploadFile(null); setUploadFormData({
          reconciliation_id: '',
          upload_type: 'carrier',
          partner_id: '',
          partner_name: '',
          period_start: '',
          period_end: ''
        }) }}
        title="Upload file đối soát"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại đối soát <span className="text-red-500">*</span>
            </label>
            <select
              value={uploadFormData.upload_type}
              onChange={(e) => setUploadFormData({ ...uploadFormData, upload_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="carrier">Đối soát với đơn vị vận chuyển</option>
              <option value="platform">Đối soát với sàn TMĐT</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File đối soát <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                    <span>Chọn file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="pl-1">hoặc kéo thả vào đây</p>
                </div>
                <p className="text-xs text-gray-500">Excel (.xlsx, .xls) hoặc CSV, tối đa 10MB</p>
                {uploadFile && (
                  <p className="text-sm text-green-600 font-medium mt-2">{uploadFile.name}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đối tác (tùy chọn)
            </label>
            <Input
              type="text"
              value={uploadFormData.partner_name}
              onChange={(e) => setUploadFormData({ ...uploadFormData, partner_name: e.target.value })}
              placeholder="Tên đối tác"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày (tùy chọn)
              </label>
              <Input
                type="date"
                value={uploadFormData.period_start}
                onChange={(e) => setUploadFormData({ ...uploadFormData, period_start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày (tùy chọn)
              </label>
              <Input
                type="date"
                value={uploadFormData.period_end}
                onChange={(e) => setUploadFormData({ ...uploadFormData, period_end: e.target.value })}
                min={uploadFormData.period_start}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadFormData({
                reconciliation_id: '',
                upload_type: 'carrier',
                partner_id: '',
                partner_name: '',
                period_start: '',
                period_end: ''
              }) }}
            >
              Hủy
            </Button>
            <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
              {uploading ? 'Đang xử lý...' : 'Upload và đối soát'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upload Details Modal */}
      <Modal
        isOpen={showUploadDetailsModal}
        onClose={() => { setShowUploadDetailsModal(false); setSelectedUpload(null) }}
        title={`Chi tiết upload: ${selectedUpload?.file_name}`}
        size="xl"
      >
        {selectedUpload && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    selectedUpload.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                    selectedUpload.status === 'processing' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    selectedUpload.status === 'failed' ? 'bg-red-100 text-red-800 border-red-200' :
                    'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }`}>
                    {selectedUpload.status === 'completed' ? 'Hoàn thành' :
                     selectedUpload.status === 'processing' ? 'Đang xử lý' :
                     selectedUpload.status === 'failed' ? 'Lỗi' : 'Chờ xử lý'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tổng số bản ghi</p>
                  <p className="text-lg font-bold">{selectedUpload.total_records || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Khớp</p>
                  <p className="text-lg font-bold text-green-600">{selectedUpload.matched_records || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Không khớp</p>
                  <p className="text-lg font-bold text-red-600">{selectedUpload.unmatched_records || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tổng tiền từ file</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedUpload.total_amount_file)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tổng tiền hệ thống</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedUpload.total_amount_system)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Chênh lệch</p>
                  <p className={`text-lg font-bold ${(selectedUpload.difference_amount || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(selectedUpload.difference_amount)}
                  </p>
                </div>
              </div>
            </div>

            {selectedUpload.error_message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Lỗi xử lý</p>
                    <p className="text-sm text-red-600 mt-1">{selectedUpload.error_message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Items Table */}
            {selectedUpload.items && selectedUpload.items.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Chi tiết các đơn hàng</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã vận đơn</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">COD (File)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">COD (Hệ thống)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Phí ship (File)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Phí ship (Hệ thống)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Chênh lệch</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedUpload.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.tracking_number || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              item.reconciliation_status === 'matched' ? 'bg-green-100 text-green-800 border-green-200' :
                              item.reconciliation_status === 'mismatched' ? 'bg-red-100 text-red-800 border-red-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                            }`}>
                              {item.reconciliation_status === 'matched' ? 'Khớp' :
                               item.reconciliation_status === 'mismatched' ? 'Lệch' : 'Không tìm thấy'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(item.cod_amount_file)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(item.cod_amount_system)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(item.shipping_fee_file)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(item.shipping_fee_system)}</td>
                          <td className={`px-4 py-3 text-sm text-right font-semibold ${(item.difference_amount || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(item.difference_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Reconciliation

