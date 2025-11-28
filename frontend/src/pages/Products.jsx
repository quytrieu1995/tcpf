import { useEffect, useState } from 'react'
import api from '../config/api'
import { Plus, Edit, Trash2, Package, Image as ImageIcon, Grid, List } from 'lucide-react'
import { useToast } from '../components/ToastContainer'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Button from '../components/Button'
import DataTable from '../components/DataTable'
import { SkeletonCard } from '../components/Skeleton'

const Products = () => {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('table') // 'table' or 'grid'
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    category_id: null,
    image_url: '',
    sku: '',
    barcode: '',
    cost_price: '',
    weight: '',
    supplier_id: null,
    low_stock_threshold: 10
  })
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/products?limit=1000')
      setProducts(response.data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Không thể tải danh sách sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      // Flatten category tree for select
      const flattenCategories = (cats) => {
        let result = []
        cats.forEach(cat => {
          result.push(cat)
          if (cat.children && cat.children.length > 0) {
            result = result.concat(flattenCategories(cat.children))
          }
        })
        return result
      }
      setCategories(flattenCategories(response.data))
    } catch (error) {
      console.error('Error fetching categories:', error)
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
        await api.put(`/products/${editingProduct.id}`, formData)
        toast.success('Cập nhật sản phẩm thành công!')
      } else {
        await api.post('/products', formData)
        toast.success('Thêm sản phẩm thành công!')
      }
      setShowModal(false)
      setEditingProduct(null)
      setFormData({ name: '', description: '', price: '', stock: '', category: '', category_id: null, image_url: '', sku: '', barcode: '', cost_price: '', weight: '', supplier_id: null, low_stock_threshold: 10 })
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
      category_id: product.category_id,
      image_url: product.image_url || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      cost_price: product.cost_price || '',
      weight: product.weight || '',
      supplier_id: product.supplier_id,
      low_stock_threshold: product.low_stock_threshold || 10
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return
    
    try {
      await api.delete(`/products/${id}`)
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

  const columns = [
    {
      key: 'product',
      header: 'Sản phẩm',
      sortable: true,
      accessor: (row) => row.name,
      render: (row) => (
        <div className="flex items-center">
          {row.image_url ? (
            <img src={row.image_url} alt={row.name} className="w-12 h-12 object-cover rounded-lg mr-3" />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
              <ImageIcon className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div>
            <div className="font-semibold text-gray-900">{row.name}</div>
            {row.sku && (
              <div className="text-xs text-gray-500">SKU: {row.sku}</div>
            )}
            {row.category && (
              <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                {row.category}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'price',
      header: 'Giá bán',
      sortable: true,
      accessor: (row) => parseFloat(row.price),
      render: (row) => (
        <div>
          <div className="font-semibold text-gray-900">{formatCurrency(row.price)}</div>
          {row.cost_price && (
            <div className="text-xs text-gray-500">Giá vốn: {formatCurrency(row.cost_price)}</div>
          )}
        </div>
      )
    },
    {
      key: 'stock',
      header: 'Tồn kho',
      sortable: true,
      accessor: (row) => parseInt(row.stock),
      render: (row) => (
        <div>
          <div className={`font-semibold ${row.stock <= (row.low_stock_threshold || 10) ? 'text-red-600' : 'text-gray-900'}`}>
            {row.stock}
          </div>
          {row.stock <= (row.low_stock_threshold || 10) && (
            <span className="text-xs text-red-600">Sắp hết</span>
          )}
        </div>
      )
    },
    {
      key: 'barcode',
      header: 'Barcode',
      render: (row) => (
        <span className="text-sm text-gray-600 font-mono">{row.barcode || '-'}</span>
      )
    },
    {
      key: 'is_active',
      header: 'Trạng thái',
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {row.is_active !== false ? 'Hoạt động' : 'Tạm khóa'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Thao tác',
      sortable: false,
      render: (row) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      )
    }
  ]

  if (loading && products.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <DataTable data={[]} columns={columns} loading={true} />
        )}
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
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={() => {
              setEditingProduct(null)
              setFormData({ name: '', description: '', price: '', stock: '', category: '', category_id: null, image_url: '', sku: '', barcode: '', cost_price: '', weight: '', supplier_id: null, low_stock_threshold: 10 })
              setFormErrors({})
              setShowModal(true)
            }}
          >
            <Plus className="w-5 h-5 mr-2" />
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable
          data={products}
          columns={columns}
          loading={loading}
          searchable={true}
          pagination={true}
          pageSize={20}
          emptyMessage="Chưa có sản phẩm nào"
        />
      ) : (
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
      )}

      {products.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>Chưa có sản phẩm nào</p>
        </div>
      )}

      {/* Product Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingProduct(null)
          setFormData({ name: '', description: '', price: '', stock: '', category: '', category_id: null, image_url: '', sku: '', barcode: '', cost_price: '', weight: '', supplier_id: null, low_stock_threshold: 10 })
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Giá bán"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
            <select
              value={formData.category_id || ''}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Chọn danh mục</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

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
                setFormData({ name: '', description: '', price: '', stock: '', category: '', category_id: null, image_url: '', sku: '', barcode: '', cost_price: '', weight: '', supplier_id: null, low_stock_threshold: 10 })
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
