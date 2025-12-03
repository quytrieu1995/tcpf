import { useEffect, useState } from 'react'
import api from '../config/api'
import { Plus, Edit, Trash2, Key, Copy, Check, Eye, EyeOff, Shield, RefreshCw, XCircle, CheckCircle } from 'lucide-react'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import { format } from 'date-fns'

const ApiKeys = () => {
  const toast = useToast()
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newApiKey, setNewApiKey] = useState(null)
  const [editingKey, setEditingKey] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    expires_at: ''
  })
  const [copiedField, setCopiedField] = useState(null)
  const [showSecrets, setShowSecrets] = useState({})

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api-keys')
      setApiKeys(response.data.api_keys || [])
    } catch (error) {
      console.error('Error fetching API keys:', error)
      toast.error('Không thể tải danh sách API keys')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post('/api-keys', formData)
      setNewApiKey(response.data)
      setShowModal(false)
      setShowKeyModal(true)
      resetForm()
      fetchApiKeys()
      toast.success('Tạo API key thành công!')
    } catch (error) {
      console.error('Error creating API key:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo API key')
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/api-keys/${editingKey.id}`, formData)
      toast.success('Cập nhật API key thành công!')
      setShowModal(false)
      resetForm()
      fetchApiKeys()
    } catch (error) {
      console.error('Error updating API key:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật API key')
    }
  }

  const handleDelete = async (id) => {
    const key = apiKeys.find(k => k.id === id)
    if (!key) return

    if (!window.confirm(`Bạn có chắc chắn muốn xóa API key "${key.name || key.client_id}"?\n\nHành động này không thể hoàn tác.`)) {
      return
    }
    
    try {
      await api.delete(`/api-keys/${id}`)
      toast.success('Xóa API key thành công!')
      fetchApiKeys()
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa API key')
    }
  }

  const handleRevoke = async (id) => {
    const key = apiKeys.find(k => k.id === id)
    if (!key) return

    if (!window.confirm(`Bạn có chắc chắn muốn vô hiệu hóa API key "${key.name || key.client_id}"?`)) {
      return
    }
    
    try {
      await api.patch(`/api-keys/${id}/revoke`)
      toast.success('Vô hiệu hóa API key thành công!')
      fetchApiKeys()
    } catch (error) {
      console.error('Error revoking API key:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi vô hiệu hóa API key')
    }
  }

  const handleActivate = async (id) => {
    try {
      await api.patch(`/api-keys/${id}/activate`)
      toast.success('Kích hoạt API key thành công!')
      fetchApiKeys()
    } catch (error) {
      console.error('Error activating API key:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi kích hoạt API key')
    }
  }

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success('Đã sao chép!')
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      toast.error('Không thể sao chép')
    }
  }

  const toggleShowSecret = (id) => {
    setShowSecrets(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      expires_at: ''
    })
    setEditingKey(null)
    setNewApiKey(null)
  }

  const openEditModal = (key) => {
    setEditingKey(key)
    setFormData({
      name: key.name || '',
      description: key.description || '',
      expires_at: key.expires_at ? key.expires_at.split('T')[0] : '',
      is_active: key.is_active
    })
    setShowModal(true)
  }

  const getStatusBadge = (isActive, expiresAt) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="w-3 h-3 mr-1" />
          Đã vô hiệu hóa
        </span>
      )
    }
    
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Đã hết hạn
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Hoạt động
      </span>
    )
  }

  const columns = [
    {
      key: 'name',
      header: 'Tên',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <Key className="w-5 h-5 text-gray-400 mr-2" />
          <div>
            <span className="font-semibold text-gray-900">{row.name || 'Không có tên'}</span>
            {row.description && (
              <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'client_id',
      header: 'Client ID',
      render: (row) => (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-800">
            {row.client_id}
          </code>
          <button
            onClick={() => copyToClipboard(row.client_id, `client_${row.id}`)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Sao chép"
          >
            {copiedField === `client_${row.id}` ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      )
    },
    {
      key: 'is_active',
      header: 'Trạng thái',
      render: (row) => getStatusBadge(row.is_active, row.expires_at)
    },
    {
      key: 'last_used_at',
      header: 'Sử dụng cuối',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.last_used_at 
            ? format(new Date(row.last_used_at), 'dd/MM/yyyy HH:mm')
            : 'Chưa sử dụng'
          }
        </span>
      )
    },
    {
      key: 'expires_at',
      header: 'Hết hạn',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.expires_at 
            ? format(new Date(row.expires_at), 'dd/MM/yyyy')
            : 'Không giới hạn'
          }
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Ngày tạo',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {format(new Date(row.created_at), 'dd/MM/yyyy')}
        </span>
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
            onClick={() => openEditModal(row)}
            title="Chỉnh sửa"
          >
            <Edit className="w-4 h-4" />
          </Button>
          {row.is_active ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRevoke(row.id)}
              className="text-orange-600 hover:text-orange-700"
              title="Vô hiệu hóa"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleActivate(row.id)}
              className="text-green-600 hover:text-green-700"
              title="Kích hoạt"
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-700"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary-600" />
            Quản lý API Keys
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Tạo và quản lý API keys để tích hợp với hệ thống bên thứ ba
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo API Key
        </Button>
      </div>

      <DataTable
        data={apiKeys}
        columns={columns}
        loading={loading}
        searchable={true}
        pagination={true}
        pageSize={20}
        emptyMessage="Chưa có API key nào"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        title={editingKey ? 'Chỉnh sửa API Key' : 'Tạo API Key mới'}
        size="lg"
      >
        <form onSubmit={editingKey ? handleEdit : handleSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Thông tin quan trọng:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Client ID và Key Secret sẽ được tự động tạo</li>
                  <li>Key Secret chỉ hiển thị một lần duy nhất khi tạo</li>
                  <li>Hãy lưu lại Key Secret ngay sau khi tạo</li>
                  <li>API Token sẽ được tạo tự động từ Client ID và Key Secret</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên API Key
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: API Key cho Mobile App"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="Mô tả về mục đích sử dụng API key này..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày hết hạn (tùy chọn)
            </label>
            <Input
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500 mt-1">
              Để trống nếu không muốn đặt thời hạn
            </p>
          </div>

          {editingKey && (
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Hoạt động</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowModal(false); resetForm() }}
            >
              Hủy
            </Button>
            <Button type="submit">
              {editingKey ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Show New API Key Modal */}
      <Modal
        isOpen={showKeyModal}
        onClose={() => { setShowKeyModal(false); setNewApiKey(null) }}
        title="API Key đã được tạo thành công!"
        size="lg"
      >
        {newApiKey && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-bold mb-2">⚠️ QUAN TRỌNG: Lưu Key Secret ngay bây giờ!</p>
                  <p>Key Secret chỉ hiển thị một lần duy nhất. Nếu bạn đóng cửa sổ này, bạn sẽ không thể xem lại Key Secret.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm text-gray-800 break-all">
                    {newApiKey.client_id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newApiKey.client_id, 'client_id')}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors border border-gray-300 rounded"
                    title="Sao chép"
                  >
                    {copiedField === 'client_id' ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Secret <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-red-50 border-2 border-red-200 px-3 py-2 rounded font-mono text-sm text-gray-800 break-all">
                    {newApiKey.key_secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newApiKey.key_secret, 'key_secret')}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors border border-gray-300 rounded"
                    title="Sao chép"
                  >
                    {copiedField === 'key_secret' ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-red-600 mt-1 font-semibold">
                  ⚠️ Lưu Key Secret này ngay! Bạn sẽ không thể xem lại.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Token
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm text-gray-800 break-all">
                    {newApiKey.token}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newApiKey.token, 'token')}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors border border-gray-300 rounded"
                    title="Sao chép"
                  >
                    {copiedField === 'token' ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Token này có thể được sử dụng trực tiếp để xác thực API
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Cách sử dụng:</p>
              <div className="text-xs text-blue-800 space-y-1">
                <p><strong>1. Sử dụng Token:</strong></p>
                <code className="block bg-white px-2 py-1 rounded mt-1 mb-2">
                  Authorization: Bearer {newApiKey.token.substring(0, 20)}...
                </code>
                <p className="mt-2"><strong>2. Sử dụng Client ID + Key Secret:</strong></p>
                <code className="block bg-white px-2 py-1 rounded mt-1">
                  X-Client-ID: {newApiKey.client_id.substring(0, 20)}...<br />
                  X-Key-Secret: {newApiKey.key_secret.substring(0, 20)}...
                </code>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => { setShowKeyModal(false); setNewApiKey(null) }}>
                Đã lưu, đóng cửa sổ
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ApiKeys

