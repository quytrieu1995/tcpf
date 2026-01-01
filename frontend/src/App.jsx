import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/ToastContainer'
import PrivateRoute from './components/PrivateRoute'
import BackendConnectionCheck from './components/BackendConnectionCheck'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import Categories from './pages/Categories'
import Promotions from './pages/Promotions'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'
import PurchaseOrders from './pages/PurchaseOrders'
import Suppliers from './pages/Suppliers'
import StockAdjustments from './pages/StockAdjustments'
import ShippingCarriers from './pages/ShippingCarriers'
import Shipments from './pages/Shipments'
import CreateOrder from './pages/CreateOrder'
import Settings from './pages/Settings'
import Reconciliation from './pages/Reconciliation'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import PricePolicies from './pages/PricePolicies'
import Cashbook from './pages/Cashbook'
import Layout from './components/Layout'
import KiotVietLayout from './components/KiotVietLayout'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/health" element={
              <div className="p-8">
                <BackendConnectionCheck />
              </div>
            } />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <KiotVietLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="categories" element={<Categories />} />
              <Route path="orders" element={<Orders />} />
              <Route path="customers" element={<Customers />} />
              <Route path="promotions" element={<Promotions />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="stock-adjustments" element={<StockAdjustments />} />
            <Route path="shipping-carriers" element={<ShippingCarriers />} />
            <Route path="shipments" element={<Shipments />} />
            <Route path="reconciliation" element={<Reconciliation />} />
              <Route path="orders/create" element={<CreateOrder />} />
              <Route path="settings" element={<Settings />} />
              <Route path="reports" element={<Reports />} />
              <Route path="price-policies" element={<PricePolicies />} />
              <Route path="cashbook" element={<Cashbook />} />
              <Route path="cashbook/reports" element={<Cashbook />} />
              {/* Report sub-routes */}
              <Route path="reports/business" element={<Reports />} />
              <Route path="reports/products" element={<Reports />} />
              <Route path="reports/customers" element={<Reports />} />
              <Route path="reports/efficiency" element={<Reports />} />
              <Route path="reports/end-of-day" element={<Reports />} />
              <Route path="reports/sales" element={<Reports />} />
              <Route path="reports/orders" element={<Reports />} />
              <Route path="reports/suppliers" element={<Reports />} />
              <Route path="reports/employees" element={<Reports />} />
              <Route path="reports/sales-channels" element={<Reports />} />
              <Route path="reports/finance" element={<Reports />} />
              </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App

