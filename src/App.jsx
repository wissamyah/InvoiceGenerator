import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, createContext, useContext } from 'react'
import InvoiceEditor from './components/InvoiceEditor'
import InvoiceList from './components/InvoiceList'

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
  
  const isEditorActive = location.pathname === '/' || location.pathname.startsWith('/edit')
  const isListActive = location.pathname === '/invoices'

  const handleNavClick = (e, path) => {
    // Only prevent navigation if we're on editor page and have unsaved changes
    if (hasUnsavedChanges && location.pathname !== path) {
      e.preventDefault()
      const confirmed = window.confirm(
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
        <div className="flex space-x-8">
          <Link
            to="/"
            onClick={(e) => handleNavClick(e, '/')}
            className={`py-4 px-3 border-b-2 font-medium text-sm transition-colors ${
              isEditorActive
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Editor
          </Link>
          <Link
            to="/invoices"
            onClick={(e) => handleNavClick(e, '/invoices')}
            className={`py-4 px-3 border-b-2 font-medium text-sm transition-colors ${
              isListActive
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
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
    </Router>
  )
}

export default App

