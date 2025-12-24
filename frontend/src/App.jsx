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
import Layout from './components/Layout'

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
                  <Layout />
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
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App

