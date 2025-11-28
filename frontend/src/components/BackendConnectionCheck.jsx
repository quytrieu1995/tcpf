import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { checkBackendConnection } from '../utils/checkBackendConnection';

const BackendConnectionCheck = () => {
  const [status, setStatus] = useState({ loading: true, connected: false });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setChecking(true);
    const result = await checkBackendConnection();
    setStatus({ ...result, loading: false });
    setChecking(false);
  };

  if (status.loading) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-sm text-blue-700">Đang kiểm tra kết nối backend...</p>
        </div>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex items-start">
          <XCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 mb-1">
              Không thể kết nối đến backend
            </h3>
            <p className="text-sm text-red-700 mb-2">{status.message}</p>
            {status.details && (
              <ul className="list-disc list-inside text-xs text-red-600 mb-3 space-y-1">
                {status.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            )}
            <button
              onClick={checkConnection}
              disabled={checking}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-800 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Đang kiểm tra...' : 'Thử lại'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-4">
      <div className="flex items-center">
        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
        <p className="text-sm text-green-700">Backend đang hoạt động bình thường</p>
      </div>
    </div>
  );
};

export default BackendConnectionCheck;

