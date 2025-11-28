import { useEffect, useState } from 'react'
import api from '../config/api'
import { Plus, Eye, Package, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'

const StockAdjustments = () => {
  const toast = useToast()
  const [stockOuts, setStockOuts] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedStockOut, setSelectedStockOut] = useState(null)
  const [formData, setFormData] = useState({
    type: 'damage',
    items: [{ product_id: '', quantity: '', unit_price: '0', notes: '' }],
    notes: ''
  })

  useEffect(() => {
    fetchStockOuts()
    fetchProducts()
  }, [])

  const fetchStockOuts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/stock/stock-outs?limit=1000')
      setStockOuts(response.data)
    } catch (error) {
      console.error('Error fetching stock outs:', error)
      toast.error('Không thể tải danh sách xuất hủy')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products?limit=1000')
      setProducts(response.data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const items = formData.items
        .filter(item => item.product_id && item.quantity)
        .map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price) || 0
        }))

      if (items.length === 0) {
        toast.warning('Vui lòng thêm ít nhất một sản phẩm')
        return
      }

      await api.post('/stock/stock-out', {
        type: formData.type,
        items,
        notes: formData.notes
      })

      toast.success('Tạo phiếu xuất hủy thành công!')
      setShowModal(false)
      resetForm()
      fetchStockOuts()
    } catch (error) {
      console.error('Error creating stock out:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleViewDetails = async (stockOut) => {
    try {
      // Fetch full details if needed
      setSelectedStockOut(stockOut)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error fetching details:', error)
      toast.error('Không thể tải chi tiết')
    }
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: '', unit_price: '0', notes: '' }]
    })
  }

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
  }

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value
    setFormData({ ...formData, items: newItems })
  }

  const resetForm = () => {
    setFormData({
      type: 'damage',
      items: [{ product_id: '', quantity: '', unit_price: '0', notes: '' }],
      notes: ''
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value)
  }

  const columns = [
    {
      key: 'reference_number',
      header: 'Mã phiếu',
      render: (row) => (
        <span className="font-semibold text-primary-600">{row.reference_number}</span>
      )
    },
    {
      key: 'type',
      header: 'Loại',
      render: (row) => {
        const types = {
          damage: 'Hỏng hóc',
          sale: 'Bán hàng',
          return: 'Trả hàng',
          transfer: 'Chuyển kho'
        }
        return (
          <span className="text-sm text-gray-600">{types[row.type] || row.type}</span>
        )
      }
    },
    {
      key: 'total_amount',
      header: 'Tổng giá trị',
      render: (row) => (
        <span className="font-semibold text-gray-900">{formatCurrency(row.total_amount)}</span>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewDetails(row)}
        >
          <Eye className="w-4 h-4 mr-1" />
          Chi tiết
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Xuất hủy hàng hóa</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Quản lý các phiếu xuất hủy, hỏng hóc</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo phiếu xuất hủy
        </Button>
      </div>

      <DataTable
        data={stockOuts}
        columns={columns}
        loading={loading}
        searchable={true}
        pagination={true}
        pageSize={20}
        emptyMessage="Chưa có phiếu xuất hủy nào"
      />

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        title="Tạo phiếu xuất hủy"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại xuất kho
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="damage">Hỏng hóc</option>
              <option value="return">Trả hàng</option>
              <option value="transfer">Chuyển kho</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Sản phẩm
              </label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Thêm sản phẩm
              </Button>
            </div>
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-5">
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Chọn sản phẩm</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} (Tồn: {product.stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Số lượng"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      min="1"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Đơn giá"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="text"
                      placeholder="Ghi chú"
                      value={item.notes}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
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
              Tạo phiếu
            </Button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedStockOut(null) }}
        title={`Chi tiết phiếu: ${selectedStockOut?.reference_number}`}
        size="lg"
      >
        {selectedStockOut && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Loại</p>
                <p className="font-semibold">{selectedStockOut.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Tổng giá trị</p>
                <p className="font-semibold">{formatCurrency(selectedStockOut.total_amount)}</p>
              </div>
            </div>
            {selectedStockOut.items && selectedStockOut.items.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Sản phẩm</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedStockOut.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.subtotal)}</td>
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

export default StockAdjustments

