import { createContext, useState, useContext, useEffect } from 'react'
import api from '../config/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setUser(JSON.parse(userData))
      // Token sẽ được tự động thêm bởi api interceptor
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password })
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      setUser(user)
      
      return { success: true }
    } catch (error) {
      console.error('Login error in AuthContext:', error)
      
      // Handle different error types
      let errorMessage = 'Đăng nhập thất bại'
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || errorMessage
      } else if (error.request) {
        // Request was made but no response received
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Kết nối quá thời gian chờ. Vui lòng kiểm tra kết nối mạng.'
        } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
          errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra máy chủ backend có đang chạy không.'
        } else {
          errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
        }
      }
      
      return { 
        success: false, 
        message: errorMessage,
        error: error
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

