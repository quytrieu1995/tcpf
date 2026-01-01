import { useState, useEffect } from 'react'
import api from '../config/api'
import { Plus, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'

const Cashbook = () => {
  const toast = useToast()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0
  })

  useEffect(() => {
    fetchTransactions()
    fetchSummary()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cashbook/transactions')
      setTransactions(response.data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Không thể tải dữ liệu sổ quỹ')
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await api.get('/cashbook/summary')
      setSummary(response.data || { totalIncome: 0, totalExpense: 0, balance: 0 })
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const columns = [
    {
      key: 'date',
      header: 'Ngày',
      render: (row) => (
        <span>{new Date(row.created_at).toLocaleDateString('vi-VN')}</span>
      )
    },
    {
      key: 'type',
      header: 'Loại',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.type === 'income' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {row.type === 'income' ? 'Thu' : 'Chi'}
        </span>
      )
    },
    {
      key: 'amount',
      header: 'Số tiền',
      render: (row) => (
        <span className={`font-semibold ${
          row.type === 'income' ? 'text-green-600' : 'text-red-600'
        }`}>
          {row.type === 'income' ? '+' : '-'}
          {new Intl.NumberFormat('vi-VN').format(row.amount)} đ
        </span>
      )
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (row) => <span>{row.description || '-'}</span>
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sổ quỹ</h1>
        <p className="text-gray-600 mt-1">Quản lý thu chi và báo cáo quỹ</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng thu</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {new Intl.NumberFormat('vi-VN').format(summary.totalIncome)} đ
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng chi</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {new Intl.NumberFormat('vi-VN').format(summary.totalExpense)} đ
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Số dư</p>
              <p className={`text-2xl font-bold mt-1 ${
                summary.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {new Intl.NumberFormat('vi-VN').format(summary.balance)} đ
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={transactions}
          columns={columns}
          loading={loading}
          searchable
          searchPlaceholder="Tìm kiếm giao dịch..."
        />
      </div>
    </div>
  )
}

export default Cashbook

