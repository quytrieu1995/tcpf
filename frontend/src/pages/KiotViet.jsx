import { useEffect, useState } from 'react'
import api from '../config/api'
import { useToast } from '../components/ToastContainer'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { 
  RefreshCw, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock,
  ShoppingCart,
  Users,
  Activity,
  AlertCircle,
  Package
} from 'lucide-react'
import { format } from 'date-fns'

const KiotViet = () => {
  const toast = useToast()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [formData, setFormData] = useState({
    retailer_code: '',
    client_id: '',
    client_secret: ''
  })
  const [testResult, setTestResult] = useState(null)
  const [syncLogs, setSyncLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [autoSyncStatus, setAutoSyncStatus] = useState(null)

  useEffect(() => {
    fetchConfig()
    fetchSyncLogs()
    fetchAutoSyncStatus()
    
    // Poll auto-sync status every 10 seconds (reduced frequency to avoid 502 spam)
    const interval = setInterval(() => {
      fetchAutoSyncStatus()
    }, 10000) // Changed from 5 to 10 seconds
    
    return () => clearInterval(interval)
  }, [])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const response = await api.get('/kiotviet/config')
      setConfig(response.data)
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSyncLogs = async () => {
    try {
      setLoadingLogs(true)
      const response = await api.get('/kiotviet/sync-logs?limit=20')
      setSyncLogs(response.data.logs || [])
    } catch (error) {
      console.error('Error fetching sync logs:', error)
    } finally {
      setLoadingLogs(false)
    }
  }

  const fetchAutoSyncStatus = async () => {
    try {
      const response = await api.get('/kiotviet/auto-sync/status')
      setAutoSyncStatus(response.data)
    } catch (error) {
      // Don't log 502 errors repeatedly, just set default status
      if (error.response?.status === 502) {
        setAutoSyncStatus({
          isRunning: false,
          isSyncing: false,
          lastSyncTime: null,
          error: 'Backend server unavailable'
        })
      } else {
        console.error('Error fetching auto-sync status:', error)
      }
    }
  }

  const handleToggleAutoSync = async () => {
    try {
      if (autoSyncStatus?.isRunning) {
        await api.post('/kiotviet/auto-sync/stop')
        toast.success('Đã tắt tự động đồng bộ')
      } else {
        await api.post('/kiotviet/auto-sync/start')
        toast.success('Đã bật tự động đồng bộ (mỗi 1 phút)')
      }
      fetchAutoSyncStatus()
    } catch (error) {
      console.error('Error toggling auto-sync:', error)
      toast.error('Có lỗi xảy ra khi thay đổi trạng thái tự động đồng bộ')
    }
  }

  const handleSaveConfig = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await api.post('/kiotviet/config', formData)
      toast.success('Cấu hình KiotViet thành công!')
      setShowConfigModal(false)
      setFormData({ retailer_code: '', client_id: '', client_secret: '' })
      fetchConfig()
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình')
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setLoading(true)
      setTestResult(null)
      const response = await api.post('/kiotviet/test-connection', formData)
      setTestResult(response.data)
      if (response.data.success) {
        toast.success('Kết nối thành công!')
      } else {
        toast.error('Kết nối thất bại: ' + (response.data.message || response.data.error))
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Có lỗi xảy ra khi kiểm tra kết nối'
      setTestResult({
        success: false,
        message: errorMessage,
        details: error.response?.data?.details
      })
      toast.error('Kết nối thất bại: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (type) => {
    try {
      setSyncing(true)
      const response = await api.post(`/kiotviet/sync/${type}`)
      
      // Show detailed result
      const { synced, failed, total, errors } = response.data
      
      const typeLabels = {
        orders: 'Đơn hàng',
        customers: 'Khách hàng',
        products: 'Sản phẩm'
      }
      
      if (synced > 0) {
        toast.success(`${typeLabels[type] || type}: ${synced} bản ghi đã được đồng bộ thành công!`)
      } else if (total === 0) {
        toast.info('Không có dữ liệu mới để đồng bộ')
      } else {
        toast.warning(`Đồng bộ hoàn tất: ${synced} thành công, ${failed} thất bại`)
      }
      
      if (failed > 0 && errors && errors.length > 0) {
        console.warn(`[KIOTVIET] Sync errors:`, errors)
        // Show first few errors
        const errorMessages = errors.slice(0, 3).map(e => e.error || e.message).join(', ')
        if (errorMessages) {
          toast.error(`Một số bản ghi thất bại: ${errorMessages}${errors.length > 3 ? '...' : ''}`)
        }
      }
      
      fetchSyncLogs()
    } catch (error) {
      console.error(`Error syncing ${type}:`, error)
      const typeLabels = {
        orders: 'đơn hàng',
        customers: 'khách hàng',
        products: 'sản phẩm'
      }
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || `Có lỗi xảy ra khi đồng bộ ${typeLabels[type] || type}`
      toast.error(errorMessage)
    } finally {
      setSyncing(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      success: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Thành công' },
      failed: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Thất bại' },
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Đang xử lý' }
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gradient-primary mb-2">
            Tích hợp KiotViet
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Đồng bộ đơn hàng, khách hàng và sản phẩm từ KiotViet
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData({ retailer_code: '', client_id: '', client_secret: '' })
            setShowConfigModal(true)
          }}
        >
          <Settings className="w-4 h-4 mr-2" />
          Cấu hình
        </Button>
      </div>

      {/* Status Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 card-hover">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Trạng thái kết nối</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchConfig}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {config?.configured ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Đã cấu hình</p>
                <p className="text-sm text-gray-600">
                  {config.has_token ? 'Đã kết nối' : 'Chưa kết nối'}
                </p>
                {config.retailer_code && (
                  <p className="text-xs text-gray-500 mt-1">
                    Tên miền: <span className="font-medium">{config.retailer_code}</span>
                  </p>
                )}
              </div>
            </div>

            {config.last_sync_at && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Lần đồng bộ cuối:</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(config.last_sync_at), 'dd/MM/yyyy HH:mm:ss')}
                </p>
              </div>
            )}

            {config.token_expires_at && (
              <div className="pt-2">
                <p className="text-sm text-gray-600 mb-1">Token hết hạn:</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(config.token_expires_at), 'dd/MM/yyyy HH:mm:ss')}
                </p>
              </div>
            )}

            {/* Auto-sync status */}
            {autoSyncStatus && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tự động đồng bộ:</p>
                    <p className={`font-medium ${autoSyncStatus.isRunning ? 'text-green-600' : 'text-gray-500'}`}>
                      {autoSyncStatus.isRunning ? 'Đang chạy (mỗi 1 phút)' : 'Đã tắt'}
                    </p>
                    {autoSyncStatus.lastSyncTime && (
                      <p className="text-xs text-gray-500 mt-1">
                        Lần đồng bộ cuối: {format(new Date(autoSyncStatus.lastSyncTime), 'HH:mm:ss')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant={autoSyncStatus.isRunning ? 'danger' : 'primary'}
                    size="sm"
                    onClick={handleToggleAutoSync}
                  >
                    {autoSyncStatus.isRunning ? 'Tắt' : 'Bật'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl">
              <XCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Chưa cấu hình</p>
              <p className="text-sm text-gray-600">Vui lòng cấu hình Client ID và Secret để bắt đầu</p>
            </div>
          </div>
        )}
      </div>

      {/* Sync Actions */}
      {config?.configured && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Đồng bộ đơn hàng</h3>
                <p className="text-sm text-gray-600">Lấy đơn hàng từ KiotViet</p>
              </div>
            </div>
            <Button
              onClick={() => handleSync('orders')}
              disabled={syncing}
              className="w-full"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Đang đồng bộ...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Đồng bộ đơn hàng
                </>
              )}
            </Button>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Đồng bộ khách hàng</h3>
                <p className="text-sm text-gray-600">Lấy khách hàng từ KiotViet</p>
              </div>
            </div>
            <Button
              onClick={() => handleSync('customers')}
              disabled={syncing}
              className="w-full"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Đang đồng bộ...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Đồng bộ khách hàng
                </>
              )}
            </Button>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Đồng bộ sản phẩm</h3>
                <p className="text-sm text-gray-600">Lấy sản phẩm từ KiotViet</p>
              </div>
            </div>
            <Button
              onClick={() => handleSync('products')}
              disabled={syncing}
              className="w-full"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Đang đồng bộ...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Đồng bộ sản phẩm
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Sync Logs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 card-hover">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Lịch sử đồng bộ</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSyncLogs}
            disabled={loadingLogs}
          >
            <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loadingLogs ? (
          <div className="text-center py-8 text-gray-500">Đang tải...</div>
        ) : syncLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Chưa có lịch sử đồng bộ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thành công</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thất bại</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {log.sync_type === 'orders' ? 'Đơn hàng' : 'Khách hàng'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">
                      {log.records_synced}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">
                      {log.records_failed}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Config Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Cấu hình KiotViet"
        size="md"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Lấy thông tin từ KiotViet:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Đăng nhập vào KiotViet</li>
                  <li>Vào Thiết lập cửa hàng → Thiết lập kết nối API</li>
                  <li>Copy Tên kết nối (tên miền), Client ID và Client Secret</li>
                </ol>
                <p className="mt-2 text-xs">
                  <strong>Ví dụ:</strong> Nếu địa chỉ của bạn là https://thoitrangmogi.kiotviet.vn, 
                  thì Tên kết nối là <code className="bg-blue-100 px-1 rounded">thoitrangmogi</code>
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Tên miền (Retailer Code)"
            value={formData.retailer_code}
            onChange={(e) => setFormData({ ...formData, retailer_code: e.target.value })}
            required
            placeholder="Ví dụ: thoitrangmogi"
            helperText="Tên kết nối từ KiotViet (phần trước .kiotviet.vn)"
          />

          <Input
            label="Client ID"
            value={formData.client_id}
            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            required
            placeholder="Nhập Client ID từ KiotViet"
          />

          <Input
            label="Client Secret"
            type="password"
            value={formData.client_secret}
            onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
            required
            placeholder="Nhập Client Secret từ KiotViet"
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConfigModal(false)
                setShowTestModal(true)
              }}
              disabled={!formData.retailer_code || !formData.client_id || !formData.client_secret}
            >
              Kiểm tra kết nối
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.retailer_code || !formData.client_id || !formData.client_secret}
              className="flex-1"
            >
              {loading ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Test Connection Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => {
          setShowTestModal(false)
          setTestResult(null)
        }}
        title="Kiểm tra kết nối"
        size="md"
      >
        <div className="space-y-4">
          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${
                    testResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResult.success ? 'Kết nối thành công!' : 'Kết nối thất bại'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    testResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {testResult.message}
                  </p>
                  {testResult.token_expires_at && (
                    <p className="text-xs text-green-600 mt-2">
                      Token hết hạn: {format(new Date(testResult.token_expires_at), 'dd/MM/yyyy HH:mm:ss')}
                    </p>
                  )}
                  {testResult.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                        Chi tiết lỗi
                      </summary>
                      <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                        {typeof testResult.details === 'string' 
                          ? testResult.details 
                          : JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleTestConnection}
            disabled={loading || !formData.retailer_code || !formData.client_id || !formData.client_secret}
            className="w-full"
          >
            {loading ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default KiotViet

