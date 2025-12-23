import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Eye, EyeOff, Copy, Check, X, Calendar, Shield, AlertCircle } from 'lucide-react';
import { useToast } from '../components/ToastContainer';
import api from '../config/api';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const ApiTokens = () => {
  const toast = useToast();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newToken, setNewToken] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    expires_at: '',
    permissions: []
  });
  const [copiedTokenId, setCopiedTokenId] = useState(null);

  const availablePermissions = [
    { value: 'products:read', label: 'Đọc sản phẩm' },
    { value: 'products:write', label: 'Ghi sản phẩm' },
    { value: 'orders:read', label: 'Đọc đơn hàng' },
    { value: 'orders:write', label: 'Ghi đơn hàng' },
    { value: 'customers:read', label: 'Đọc khách hàng' },
    { value: 'customers:write', label: 'Ghi khách hàng' },
    { value: 'shipments:read', label: 'Đọc vận đơn' },
    { value: 'shipments:write', label: 'Ghi vận đơn' },
    { value: 'reports:read', label: 'Đọc báo cáo' }
  ];

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api-tokens');
      setTokens(response.data.tokens || []);
    } catch (error) {
      console.error('Error fetching API tokens:', error);
      toast.error('Không thể tải danh sách API tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await api.post('/api-tokens', formData);
      setNewToken(response.data);
      setShowModal(false);
      setShowTokenModal(true);
      setFormData({ name: '', expires_at: '', permissions: [] });
      fetchTokens();
      toast.success('Tạo API token thành công!');
    } catch (error) {
      console.error('Error creating API token:', error);
      toast.error(error.response?.data?.message || 'Không thể tạo API token');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa API token này?')) {
      return;
    }

    try {
      await api.delete(`/api-tokens/${id}`);
      toast.success('Xóa API token thành công');
      fetchTokens();
    } catch (error) {
      console.error('Error deleting API token:', error);
      toast.error('Không thể xóa API token');
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.post(`/api-tokens/${id}/revoke`);
      toast.success('Vô hiệu hóa API token thành công');
      fetchTokens();
    } catch (error) {
      console.error('Error revoking API token:', error);
      toast.error('Không thể vô hiệu hóa API token');
    }
  };

  const handleActivate = async (id) => {
    try {
      await api.post(`/api-tokens/${id}/activate`);
      toast.success('Kích hoạt API token thành công');
      fetchTokens();
    } catch (error) {
      console.error('Error activating API token:', error);
      toast.error('Không thể kích hoạt API token');
    }
  };

  const handleCopyToken = (token) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId('new');
    setTimeout(() => setCopiedTokenId(null), 2000);
    toast.success('Đã sao chép token vào clipboard');
  };

  const togglePermission = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const columns = [
    {
      key: 'name',
      label: 'Tên token',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{row.name}</span>
        </div>
      )
    },
    {
      key: 'token_preview',
      label: 'Token',
      render: (row) => (
        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
          {row.token_preview}
        </code>
      )
    },
    {
      key: 'permissions',
      label: 'Quyền',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.permissions && row.permissions.length > 0 ? (
            row.permissions.slice(0, 3).map((perm, idx) => (
              <span
                key={idx}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
              >
                {perm.split(':')[0]}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400">Không có quyền</span>
          )}
          {row.permissions && row.permissions.length > 3 && (
            <span className="text-xs text-gray-500">+{row.permissions.length - 3}</span>
          )}
        </div>
      )
    },
    {
      key: 'last_used_at',
      label: 'Lần sử dụng cuối',
      render: (row) => (
        <div className="text-sm text-gray-600">
          {row.last_used_at
            ? format(new Date(row.last_used_at), 'dd/MM/yyyy HH:mm', { locale: vi })
            : 'Chưa sử dụng'}
        </div>
      )
    },
    {
      key: 'expires_at',
      label: 'Hết hạn',
      render: (row) => {
        if (!row.expires_at) {
          return <span className="text-sm text-gray-500">Không hết hạn</span>;
        }
        const isExpired = row.is_expired;
        return (
          <div className="flex items-center gap-1">
            <Calendar className={`w-4 h-4 ${isExpired ? 'text-red-500' : 'text-gray-400'}`} />
            <span className={`text-sm ${isExpired ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              {format(new Date(row.expires_at), 'dd/MM/yyyy', { locale: vi })}
            </span>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => {
        if (row.is_expired) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
              <X className="w-3 h-3" />
              Hết hạn
            </span>
          );
        }
        if (!row.is_active) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
              <X className="w-3 h-3" />
              Đã vô hiệu hóa
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
            <Check className="w-3 h-3" />
            Hoạt động
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.is_active && !row.is_expired ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRevoke(row.id)}
              className="text-orange-600 hover:text-orange-700"
              title="Vô hiệu hóa"
            >
              <Shield className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleActivate(row.id)}
              className="text-green-600 hover:text-green-700"
              title="Kích hoạt"
            >
              <Check className="w-4 h-4" />
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Quản lý API Tokens</h2>
          <p className="text-gray-600 mt-1 text-sm">
            Tạo và quản lý API tokens để tích hợp với các ứng dụng bên ngoài
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo API Token
        </Button>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Lưu ý về API Tokens:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Token chỉ hiển thị một lần khi tạo mới. Hãy lưu lại ngay.</li>
            <li>Token có thể được sử dụng để xác thực các request API thay cho JWT token.</li>
            <li>Format: <code className="bg-blue-100 px-1 rounded">tcpf_xxxxxxxxxxxxx</code></li>
            <li>Sử dụng header: <code className="bg-blue-100 px-1 rounded">Authorization: Bearer tcpf_xxxxxxxxxxxxx</code></li>
          </ul>
        </div>
      </div>

      <DataTable
        data={tokens}
        columns={columns}
        loading={loading}
        searchable={false}
      />

      {/* Create Token Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFormData({ name: '', expires_at: '', permissions: [] });
        }}
        title="Tạo API Token mới"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Tên token"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Ví dụ: Mobile App Token"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ngày hết hạn (tùy chọn)
            </label>
            <Input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Để trống nếu token không hết hạn
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quyền truy cập
            </label>
            <div className="border border-gray-200 rounded-lg p-3 max-h-60 overflow-y-auto">
              {availablePermissions.map((perm) => (
                <label
                  key={perm.value}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm.value)}
                    onChange={() => togglePermission(perm.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{perm.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Chọn các quyền mà token này có thể sử dụng
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setFormData({ name: '', expires_at: '', permissions: [] });
              }}
            >
              Hủy
            </Button>
            <Button type="submit" loading={submitting}>
              Tạo Token
            </Button>
          </div>
        </form>
      </Modal>

      {/* Show New Token Modal */}
      <Modal
        isOpen={showTokenModal}
        onClose={() => {
          setShowTokenModal(false);
          setNewToken(null);
        }}
        title="API Token đã được tạo"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">⚠️ Lưu ý quan trọng:</p>
                <p>Token này chỉ hiển thị một lần. Hãy sao chép và lưu lại ngay bây giờ. Bạn sẽ không thể xem lại token này sau khi đóng cửa sổ này.</p>
              </div>
            </div>
          </div>

          {newToken && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên token
                </label>
                <p className="text-gray-900">{newToken.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Token
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg text-sm font-mono break-all">
                    {newToken.token}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyToken(newToken.token)}
                    className="flex-shrink-0"
                  >
                    {copiedTokenId === 'new' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {newToken.expires_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hết hạn
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(newToken.expires_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </p>
                </div>
              )}

              {newToken.permissions && newToken.permissions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quyền truy cập
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {newToken.permissions.map((perm, idx) => {
                      const permLabel = availablePermissions.find(p => p.value === perm)?.label || perm;
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-700"
                        >
                          {permLabel}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Cách sử dụng:</p>
                <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`curl -X GET "https://sale.thuanchay.vn/api/products" \\
  -H "Authorization: Bearer ${newToken.token}"`}
                </pre>
              </div>
            </>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => {
              setShowTokenModal(false);
              setNewToken(null);
            }}>
              Đã lưu token
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ApiTokens;

