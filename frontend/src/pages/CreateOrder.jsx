import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../config/api'
import { Plus, Minus, ShoppingCart, X } from 'lucide-react'
import { useToast } from '../components/ToastContainer'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import AddressAutocomplete from '../components/AddressAutocomplete'

const CreateOrder = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [shippingMethods, setShippingMethods] = useState([])
  const [promotions, setPromotions] = useState([])
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [formData, setFormData] = useState({
    customer_id: '',
    payment_method: 'cash',
    shipping_method_id: '',
    shipping_address: '',
    shipping_phone: '',
    promotion_code: '',
    notes: ''
  })
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchCustomers()
    fetchShippingMethods()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products?limit=1000')
      // Ensure response.data.products is an array
      if (Array.isArray(response.data?.products)) {
        setProducts(response.data.products)
      } else if (Array.isArray(response.data)) {
        setProducts(response.data)
      } else {
        setProducts([])
        console.warn('Products response is not an array:', response.data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([]) // Set empty array on error
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers?limit=1000')
      // Handle both response formats: array or object with customers property
      if (Array.isArray(response.data)) {
        setCustomers(response.data)
      } else if (response.data?.customers && Array.isArray(response.data.customers)) {
        setCustomers(response.data.customers)
      } else {
        setCustomers([])
        console.warn('Customers response is not an array:', response.data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([]) // Set empty array on error
    }
  }

  const fetchShippingMethods = async () => {
    try {
      const response = await api.get('/shipping?active_only=true')
      // Ensure response.data is an array
      if (Array.isArray(response.data)) {
        setShippingMethods(response.data)
      } else {
        setShippingMethods([])
        console.warn('Shipping methods response is not an array:', response.data)
      }
    } catch (error) {
      console.error('Error fetching shipping methods:', error)
      setShippingMethods([]) // Set empty array on error
      toast.error('Không thể tải danh sách đơn vị vận chuyển')
    }
  }

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id)
    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: 1,
        stock: product.stock
      }])
    }
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, quantity }
        : item
    ))
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId))
  }

  const createCustomer = async () => {
    // Validate required fields
    if (!customerForm.name || customerForm.name.trim() === '') {
      toast.error('Vui lòng nhập tên khách hàng')
      return
    }

    try {
      const response = await api.post('/customers', {
        name: customerForm.name.trim(),
        email: customerForm.email?.trim() || null,
        phone: customerForm.phone?.trim() || null,
        address: customerForm.address?.trim() || null
      })
      
      toast.success('Tạo khách hàng thành công!')
      setShowCustomerModal(false)
      setCustomerForm({ name: '', email: '', phone: '', address: '' })
      
      // Refresh customers list
      await fetchCustomers()
      
      // Set the newly created customer as selected
      if (response.data?.id) {
        setFormData({ ...formData, customer_id: response.data.id.toString() })
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      // Show specific error messages
      if (error.response?.status === 400) {
        const errors = error.response.data?.errors || []
        if (errors.length > 0) {
          toast.error(errors[0].msg || 'Dữ liệu không hợp lệ')
        } else {
          toast.error(error.response.data?.message || 'Dữ liệu không hợp lệ')
        }
      } else if (error.response?.status === 500) {
        toast.error('Lỗi server. Vui lòng thử lại sau.')
      } else if (!error.response) {
        toast.error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối.')
      } else {
        toast.error(error.response.data?.message || 'Có lỗi xảy ra khi tạo khách hàng')
      }
    }
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const calculateShipping = () => {
    if (!formData.shipping_method_id) return 0
    const method = shippingMethods.find(m => m.id === parseInt(formData.shipping_method_id))
    return method ? parseFloat(method.cost) : 0
  }

  const calculateDiscount = () => {
    // TODO: Apply promotion logic
    return 0
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping() - calculateDiscount()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (cart.length === 0) {
      toast.warning('Vui lòng thêm ít nhất một sản phẩm vào giỏ hàng')
      return
    }

    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }))

      // Normalize data: convert empty strings to null for integer fields
      const orderData = {
        items,
        customer_id: formData.customer_id && formData.customer_id !== '' ? parseInt(formData.customer_id) : null,
        shipping_method_id: formData.shipping_method_id && formData.shipping_method_id !== '' ? parseInt(formData.shipping_method_id) : null,
        payment_method: formData.payment_method || 'cash',
        shipping_address: formData.shipping_address || null,
        shipping_phone: formData.shipping_phone || null,
        promotion_code: formData.promotion_code || null,
        notes: formData.notes || null
      }

      const response = await api.post('/orders', orderData)

      toast.success('Tạo đơn hàng thành công!')
      navigate(`/orders`)
    } catch (error) {
      console.error('Error creating order:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      // Show specific error messages
      if (error.response?.status === 400) {
        const errors = error.response.data?.errors || []
        if (errors.length > 0) {
          toast.error(errors[0].msg || 'Dữ liệu không hợp lệ')
        } else {
          toast.error(error.response.data?.message || 'Dữ liệu không hợp lệ')
        }
      } else if (error.response?.status === 500) {
        toast.error(error.response.data?.message || 'Lỗi server. Vui lòng thử lại sau.')
      } else if (!error.response) {
        toast.error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối.')
      } else {
        toast.error(error.response.data?.message || 'Có lỗi xảy ra khi tạo đơn hàng')
      }
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value)
  }

  const filteredProducts = Array.isArray(products) 
    ? products.filter(product =>
        product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : []

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tạo đơn hàng mới</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Thêm sản phẩm và thông tin khách hàng để tạo đơn hàng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Products */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <Input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {Array.isArray(filteredProducts) && filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-lg p-3 hover:border-primary-500 cursor-pointer transition-colors"
                    onClick={() => addToCart(product)}
                  >
                    <div className="font-medium text-sm text-gray-900 mb-1">{product.name}</div>
                    <div className="text-xs text-gray-500 mb-1">SKU: {product.sku || '-'}</div>
                    <div className="text-sm font-semibold text-primary-600">{formatCurrency(product.price)}</div>
                    <div className="text-xs text-gray-400 mt-1">Tồn: {product.stock}</div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-500 py-8">
                  {searchTerm ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Giỏ hàng ({cart.length})
            </h2>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Chưa có sản phẩm nào trong giỏ hàng</p>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{item.product_name}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(item.price)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center font-medium">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-600 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
            <h2 className="text-lg font-semibold mb-4">Thông tin đơn hàng</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Khách hàng
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Khách vãng lai</option>
                  {Array.isArray(customers) && customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomerModal(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phương thức thanh toán
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="cash">Tiền mặt</option>
                <option value="bank_transfer">Chuyển khoản</option>
                <option value="credit">Trả chậm</option>
                <option value="card">Thẻ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đơn vị vận chuyển
              </label>
              <select
                value={formData.shipping_method_id}
                onChange={(e) => setFormData({ ...formData, shipping_method_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Không vận chuyển</option>
                {Array.isArray(shippingMethods) && shippingMethods.map(method => (
                  <option key={method.id} value={method.id}>
                    {method.name} - {formatCurrency(method.cost)}
                  </option>
                ))}
              </select>
            </div>

            {formData.shipping_method_id && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa chỉ giao hàng
                  </label>
                  <AddressAutocomplete
                    value={formData.shipping_address}
                    onChange={(address) => setFormData({ ...formData, shipping_address: address })}
                    onAddressChange={(addressData) => {
                      setFormData({ 
                        ...formData, 
                        shipping_address: addressData.fullAddress,
                        area: addressData.district,
                        ward: addressData.ward
                      })
                    }}
                    placeholder="Nhập địa chỉ giao hàng"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <Input
                    type="tel"
                    value={formData.shipping_phone}
                    onChange={(e) => setFormData({ ...formData, shipping_phone: e.target.value })}
                  />
                </div>
              </>
            )}

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

            {/* Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tạm tính:</span>
                <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
              </div>
              {calculateShipping() > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Phí vận chuyển:</span>
                  <span className="font-medium">{formatCurrency(calculateShipping())}</span>
                </div>
              )}
              {calculateDiscount() > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Giảm giá:</span>
                  <span className="font-medium">-{formatCurrency(calculateDiscount())}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Tổng cộng:</span>
                <span className="text-primary-600">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={cart.length === 0}>
              Tạo đơn hàng
            </Button>
          </form>
        </div>
      </div>

      {/* Create Customer Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => { setShowCustomerModal(false); setCustomerForm({ name: '', email: '', phone: '', address: '' }) }}
        title="Thêm khách hàng mới"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên khách hàng <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={customerForm.name}
              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={customerForm.email}
              onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Điện thoại
            </label>
            <Input
              type="tel"
              value={customerForm.phone}
              onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ
            </label>
            <AddressAutocomplete
              value={customerForm.address}
              onChange={(address) => setCustomerForm({ ...customerForm, address })}
              onAddressChange={(addressData) => {
                setCustomerForm({ 
                  ...customerForm, 
                  address: addressData.fullAddress
                })
              }}
              placeholder="Nhập địa chỉ khách hàng"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowCustomerModal(false); setCustomerForm({ name: '', email: '', phone: '', address: '' }) }}
            >
              Hủy
            </Button>
            <Button onClick={createCustomer} disabled={!customerForm.name}>
              Tạo khách hàng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default CreateOrder

