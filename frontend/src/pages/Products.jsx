import { useEffect, useState } from 'react'
import axios from 'axios'
import { Plus, Edit, Trash2, Package, Image as ImageIcon } from 'lucide-react'
import { useToast } from '../components/ToastContainer'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Button from '../components/Button'
import { SkeletonCard, SkeletonTable } from '../components/Skeleton'

const Products = () => {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    image_url: '',
    sku: '',
    barcode: '',
    cost_price: '',
    weight: '',
    low_stock_threshold: 10
  })
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    fetchProducts()
  }, [search])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/products?search=${search}&limit=100`)
      setProducts(response.data.products)
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Không thể tải danh sách sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = 'Tên sản phẩm là bắt buộc'
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = 'Giá phải lớn hơn 0'
    if (formData.stock === '' || parseInt(formData.stock) < 0) errors.stock = 'Tồn kho không hợp lệ'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.warning('Vui lòng điền đầy đủ thông tin')
      return
    }

    try {
      setSubmitting(true)
      if (editingProduct) {
        await axios.put(`/api/products/${editingProduct.id}`, formData)
        toast.success('Cập nhật sản phẩm thành công!')
      } else {
        await axios.post('/api/products', formData)
        toast.success('Thêm sản phẩm thành công!')
      }
      setShowModal(false)
      setEditingProduct(null)
      setFormData({ name: '', description: '', price: '', stock: '', category: '', image_url: '', sku: '', barcode: '', cost_price: '', weight: '', low_stock_threshold: 10 })
      setFormErrors({})
      fetchProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu sản phẩm')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      category: product.category || '',
      image_url: product.image_url || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return
    
    try {
      await axios.delete(`/api/products/${id}`)
      toast.success('Xóa sản phẩm thành công!')
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Có lỗi xảy ra khi xóa sản phẩm')
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value)
  }

  if (loading && products.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quản lý sản phẩm</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Quản lý danh sách sản phẩm của bạn</p>
        </div>
        <Button
          onClick={() => {
            setEditingProduct(null)
            setFormData({ name: '', description: '', price: '', stock: '', category: '', image_url: '', sku: '', barcode: '', cost_price: '', weight: '', low_stock_threshold: 10 })
            setFormErrors({})
            setShowModal(true)
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Thêm sản phẩm
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm sản phẩm theo tên, mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden card-hover">
            <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}
              {product.stock <= (product.low_stock_threshold || 10) && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  Sắp hết
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
              {product.category && (
                <span className="inline-block text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded mb-2">{product.category}</span>
              )}
              {product.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</p>
                  <p className={`text-xs ${product.stock > 0 ? 'text-gray-500' : 'text-red-500 font-semibold'}`}>
                    Tồn kho: {product.stock}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                    title="Chỉnh sửa"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>Chưa có sản phẩm nào</p>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingProduct(null)
          setFormData({ name: '', description: '', price: '', stock: '', category: '', image_url: '', sku: '', barcode: '', cost_price: '', weight: '', low_stock_threshold: 10 })
          setFormErrors({})
        }}
        title={editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Tên sản phẩm"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  rows="3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Giá"
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  error={formErrors.price}
                  helperText="Giá bán của sản phẩm"
                />
                <Input
                  label="Tồn kho"
                  type="number"
                  required
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  error={formErrors.stock}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SKU"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  helperText="Mã sản phẩm"
                />
                <Input
                  label="Barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Giá vốn"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  helperText="Giá nhập"
                />
                <Input
                  label="Trọng lượng (kg)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
              <Input
                label="Danh mục"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              <Input
                label="URL hình ảnh"
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                helperText="Link hình ảnh sản phẩm"
              />
              <Input
                label="Ngưỡng cảnh báo tồn kho"
                type="number"
                min="0"
                value={formData.low_stock_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 10 })}
                helperText="Cảnh báo khi tồn kho <= giá trị này"
              />
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false)
                    setEditingProduct(null)
                    setFormData({ name: '', description: '', price: '', stock: '', category: '', image_url: '', sku: '', barcode: '', cost_price: '', weight: '', low_stock_threshold: 10 })
                    setFormErrors({})
                  }}
                  className="flex-1"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  className="flex-1"
                >
                  {editingProduct ? 'Cập nhật' : 'Thêm mới'}
                </Button>
              </div>
            </form>
      </Modal>
    </div>
  )
}

export default Products

