import api from '../config/api';

/**
 * Check if backend is accessible
 */
export const checkBackendConnection = async () => {
  try {
    const response = await api.get('/health');
    return {
      connected: true,
      data: response.data,
      message: 'Backend đang hoạt động'
    };
  } catch (error) {
    if (!error.response) {
      return {
        connected: false,
        message: 'Không thể kết nối đến backend. Kiểm tra:',
        details: [
          'Backend có đang chạy không? (cd backend && npm run dev)',
          'Backend có chạy trên port 5000 không?',
          'Kiểm tra firewall/network settings',
          'Nếu dùng Docker, kiểm tra: docker-compose ps'
        ],
        error: error.message
      };
    }
    return {
      connected: false,
      message: `Backend trả về lỗi: ${error.response.status}`,
      error: error.message
    };
  }
};

/**
 * Display connection status in console
 */
export const logBackendStatus = async () => {
  const status = await checkBackendConnection();
  if (status.connected) {
    console.log('✅', status.message);
    console.log('📊 Backend info:', status.data);
  } else {
    console.error('❌', status.message);
    if (status.details) {
      status.details.forEach(detail => console.error('   -', detail));
    }
  }
  return status;
};

