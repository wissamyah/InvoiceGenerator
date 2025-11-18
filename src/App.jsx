import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, createContext, useContext } from 'react'
import InvoiceEditor from './components/InvoiceEditor'
import InvoiceList from './components/InvoiceList'
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
  
  const isEditorActive = location.pathname === '/' || location.pathname.startsWith('/edit')
  const isListActive = location.pathname === '/invoices'

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

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex space-x-1">
          <Link
            to="/"
            onClick={(e) => handleNavClick(e, '/')}
            className={`py-3 px-4 font-medium text-sm transition-colors ${
              isEditorActive
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
            }`}
          >
            Editor
          </Link>
          <Link
            to="/invoices"
            onClick={(e) => handleNavClick(e, '/invoices')}
            className={`py-3 px-4 font-medium text-sm transition-colors ${
              isListActive
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
            }`}
          >
            Invoices
          </Link>
        </div>
      </div>
    </nav>
  )
}

function App() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  return (
    <Router>
      <ModalProvider>
        <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges }}>
          <div className="min-h-screen bg-gray-100">
            <Navigation />
            <Routes>
              <Route path="/" element={<InvoiceEditor />} />
              <Route path="/edit/:id" element={<InvoiceEditor />} />
              <Route path="/invoices" element={<InvoiceList />} />
            </Routes>
          </div>
        </UnsavedChangesContext.Provider>
      </ModalProvider>
    </Router>
  )
}

export default App

