import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, createContext, useContext } from 'react'
import { Toaster } from 'sonner'
import PasswordGate, { useAuth } from './components/PasswordGate'
import Home from './components/Home'
import InvoiceEditor from './components/InvoiceEditor'
import InvoiceList from './components/InvoiceList'
import SupplierList from './components/SupplierList'
import SupplierEditor from './components/SupplierEditor'
import ClientList from './components/ClientList'
import ClientEditor from './components/ClientEditor'
import InspectionRequestEditor from './components/InspectionRequestEditor'
import InspectionRequestList from './components/InspectionRequestList'
import { ModalProvider, useModal } from './contexts/ModalContext'

// Create a context to track unsaved changes
const UnsavedChangesContext = createContext({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {}
})

export const useUnsavedChanges = () => useContext(UnsavedChangesContext)

function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasUnsavedChanges } = useUnsavedChanges()
  const { showConfirm } = useModal()
  const { logout } = useAuth()

  const isHomeActive = location.pathname === '/'
  const isInvoicesActive = location.pathname.startsWith('/invoices')
  const isManagementActive = location.pathname.startsWith('/management')
  const isInspectionActive = location.pathname.startsWith('/inspection')

  const handleNavClick = async (e, path) => {
    // Only prevent navigation if we're on editor page and have unsaved changes
    if (hasUnsavedChanges && location.pathname !== path) {
      e.preventDefault()
      const confirmed = await showConfirm(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave this page?'
      )
      if (confirmed) {
        navigate(path)
      }
    }
  }

  const handleLogout = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await showConfirm(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to lock the application?'
      )
      if (!confirmed) return
    }
    logout()
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            <Link
              to="/"
              onClick={(e) => handleNavClick(e, '/')}
              className={`py-3 px-3 md:px-4 font-medium text-sm transition-colors min-h-[44px] flex items-center ${
                isHomeActive
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              Home
            </Link>
            <Link
              to="/invoices"
              onClick={(e) => handleNavClick(e, '/invoices')}
              className={`py-3 px-3 md:px-4 font-medium text-sm transition-colors min-h-[44px] flex items-center ${
                isInvoicesActive
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              Invoices
            </Link>
            <Link
              to="/management/suppliers"
              onClick={(e) => handleNavClick(e, '/management/suppliers')}
              className={`py-3 px-3 md:px-4 font-medium text-sm transition-colors min-h-[44px] flex items-center ${
                isManagementActive
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              Management
            </Link>
            <Link
              to="/inspection/requests"
              onClick={(e) => handleNavClick(e, '/inspection/requests')}
              className={`py-3 px-3 md:px-4 font-medium text-sm transition-colors min-h-[44px] flex items-center ${
                isInspectionActive
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              Inspection Requests
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Lock application"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}

function App() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  return (
    <PasswordGate>
      <Router>
        <ModalProvider>
          <Toaster position="top-right" richColors />
          <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges }}>
            <div className="min-h-screen bg-gray-100">
              <Navigation />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/invoices/editor" element={<InvoiceEditor />} />
                <Route path="/invoices/editor/:id" element={<InvoiceEditor />} />
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/management/suppliers" element={<SupplierList />} />
                <Route path="/management/suppliers/editor" element={<SupplierEditor />} />
                <Route path="/management/suppliers/editor/:id" element={<SupplierEditor />} />
                <Route path="/management/clients" element={<ClientList />} />
                <Route path="/management/clients/editor" element={<ClientEditor />} />
                <Route path="/management/clients/editor/:id" element={<ClientEditor />} />
                <Route path="/inspection/requests" element={<InspectionRequestList />} />
                <Route path="/inspection/requests/editor" element={<InspectionRequestEditor />} />
                <Route path="/inspection/requests/editor/:id" element={<InspectionRequestEditor />} />
              </Routes>
            </div>
          </UnsavedChangesContext.Provider>
        </ModalProvider>
      </Router>
    </PasswordGate>
  )
}

export default App

