import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import db, { id as generateId } from '../lib/instantdb'
import { PDFDownloadLink } from '@react-pdf/renderer'
import PDFDocument from './PDFDocument'
import { useUnsavedChanges } from '../App'
import { useModal } from '../contexts/ModalContext'

const InvoiceEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { data } = db.useQuery({ invoices: {}, suppliers: {}, clients: {} })
  const initialInvoiceRef = useRef(null)
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges()
  const { showAlert, showConfirm } = useModal()
  const [isNavigating, setIsNavigating] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false) // Track if invoice has been loaded
  
  const [invoice, setInvoice] = useState({
    invoiceNumber: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    documentType: 'invoice', // 'invoice' or 'proforma'
    currency: 'EUR',
    shippingType: 'C&F',
    vatEnabled: false,
    vatRate: 0,
    notes: '',
    supplierId: '',
    clientId: '',
    from: {
      name: '',
      address: '',
      email: '',
      phone: '',
      country: '',
      piva: '',
      cf: ''
    },
    to: {
      name: '',
      address: '',
      email: '',
      phone: '',
      country: ''
    },
    lineItems: [
      { description: '', quantity: 0, unit: 'None', rate: 0, amount: 0 }
    ],
    bankDetails: {
      bankName: '',
      accountName: '',
      iban: '',
      bic: ''
    }
  })

  // Load existing invoice if editing (only once when data becomes available)
  useEffect(() => {
    if (id && data?.invoices && !isLoaded) {
      const existingInvoice = data.invoices.find(inv => inv.id === id)
      if (existingInvoice) {
        // Deep clone to create a mutable copy (InstantDB returns frozen objects)
        const mutableInvoice = JSON.parse(JSON.stringify(existingInvoice))
        setInvoice(mutableInvoice)
        initialInvoiceRef.current = JSON.parse(JSON.stringify(existingInvoice))
        setIsLoaded(true) // Mark as loaded to prevent reloading
      }
    } else if (!id && !isLoaded) {
      // Store initial state for new invoice
      initialInvoiceRef.current = JSON.parse(JSON.stringify(invoice))
      setIsLoaded(true)
    }
  }, [id, data, isLoaded])
  
  // Reset loaded flag when ID changes (for navigating between invoices)
  useEffect(() => {
    setIsLoaded(false)
  }, [id])

  // Cleanup: Reset unsaved changes flag when component unmounts
  useEffect(() => {
    return () => {
      setHasUnsavedChanges(false)
    }
  }, [setHasUnsavedChanges])

  // Check if invoice has been modified from its initial state
  const hasActualChanges = useCallback(() => {
    if (!initialInvoiceRef.current || !isLoaded) return false
    
    // Compare current invoice with initial state
    return JSON.stringify(invoice) !== JSON.stringify(initialInvoiceRef.current)
  }, [invoice, isLoaded])

  // Track if there are unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(hasActualChanges())
  }, [invoice, hasActualChanges, setHasUnsavedChanges])

  // Prevent closing/refreshing the page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !isNavigating) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, isNavigating])

  // Custom navigation wrapper to prevent accidental navigation
  const handleNavigate = useCallback(async (path) => {
    if (hasUnsavedChanges) {
      const confirmed = await showConfirm(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave this page?'
      )
      if (confirmed) {
        setIsNavigating(true)
        setHasUnsavedChanges(false)
        navigate(path)
      }
    } else {
      navigate(path)
    }
  }, [hasUnsavedChanges, navigate, showConfirm, setHasUnsavedChanges])

  // Calculate line item amount
  const calculateLineAmount = (quantity, rate) => {
    return quantity * rate
  }

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = invoice.lineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0
      return sum + amount
    }, 0)
    const vatAmount = invoice.vatEnabled ? (subtotal * (parseFloat(invoice.vatRate) || 0) / 100) : 0
    const total = subtotal + vatAmount
    return { subtotal, vatAmount, total }
  }

  const { subtotal, vatAmount, total } = calculateTotals()

  // Update line item
  const updateLineItem = (index, field, value) => {
    const newLineItems = [...invoice.lineItems]
    // Clone the specific item being updated to avoid mutating frozen objects
    const updatedItem = { ...newLineItems[index] }
    
    // Parse numeric fields
    if (field === 'quantity' || field === 'rate') {
      updatedItem[field] = parseFloat(value) || 0
      const quantity = parseFloat(updatedItem.quantity) || 0
      const rate = parseFloat(updatedItem.rate) || 0
      updatedItem.amount = calculateLineAmount(quantity, rate)
    } else {
      updatedItem[field] = value
    }
    
    newLineItems[index] = updatedItem
    setInvoice({ ...invoice, lineItems: newLineItems })
  }

  // Add new line item
  const addLineItem = () => {
    setInvoice({
      ...invoice,
      lineItems: [...invoice.lineItems, { description: '', quantity: 0, unit: 'None', rate: 0, amount: 0 }]
    })
  }

  // Remove line item
  const removeLineItem = (index) => {
    if (invoice.lineItems.length > 1) {
      const newLineItems = invoice.lineItems.filter((_, i) => i !== index)
      setInvoice({ ...invoice, lineItems: newLineItems })
    }
  }

  // Update nested object (from, to, bankDetails)
  const updateNested = (parent, field, value) => {
    setInvoice({
      ...invoice,
      [parent]: { ...invoice[parent], [field]: value }
    })
  }

  // Handle supplier selection
  const handleSupplierChange = (supplierId) => {
    const supplier = data?.suppliers?.find(s => s.id === supplierId)
    if (supplier) {
      setInvoice({
        ...invoice,
        supplierId: supplierId,
        from: {
          name: supplier.name || '',
          address: `${supplier.address || ''}${supplier.city ? ', ' + supplier.city : ''}${supplier.zipCode ? ' ' + supplier.zipCode : ''}`,
          email: supplier.email || '',
          phone: supplier.phone || '',
          country: supplier.country || '',
          piva: supplier.vatNumber || '',
          cf: supplier.cf || ''
        }
      })
    } else {
      // Clear supplier
      setInvoice({
        ...invoice,
        supplierId: ''
      })
    }
  }

  // Handle client selection
  const handleClientChange = (clientId) => {
    const client = data?.clients?.find(c => c.id === clientId)
    if (client) {
      setInvoice({
        ...invoice,
        clientId: clientId,
        to: {
          name: client.name || '',
          address: `${client.address || ''}${client.city ? ', ' + client.city : ''}`,
          email: client.email || '',
          phone: client.phone || '',
          country: client.country || ''
        }
      })
    } else {
      // Clear client
      setInvoice({
        ...invoice,
        clientId: ''
      })
    }
  }

  // Save invoice
  const saveInvoice = async () => {
    try {
      if (id) {
        // Update existing invoice
        await db.transact([
          db.tx.invoices[id].update(invoice)
        ])
        setHasUnsavedChanges(false) // Clear unsaved changes flag
        setIsNavigating(false)
        showAlert('Success', 'Invoice updated successfully!', 'success')
      } else {
        // Create new invoice
        await db.transact([
          db.tx.invoices[generateId()].update(invoice)
        ])
        setHasUnsavedChanges(false) // Clear unsaved changes flag
        setIsNavigating(true)
        showAlert('Success', 'Invoice created successfully!', 'success')
        navigate('/invoices')
      }
    } catch (error) {
      console.error('Error saving invoice:', error)
      showAlert('Error', 'Error saving invoice. Please try again.', 'error')
    }
  }

  // Format currency
  const formatCurrency = (amount) => {
    const symbol = invoice.currency === 'EUR' ? '€' : '$'
    const numAmount = parseFloat(amount) || 0
    return `${symbol}${numAmount.toFixed(2)}`
  }

  // Format date to EU format (DD/MM/YYYY)
  const formatDateEU = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return format(date, 'dd/MM/yyyy')
    } catch {
      return dateString
    }
  }

  // Generate professional filename for PDF
  const generatePDFFilename = () => {
    // Get short version of From name (first 2 words or 15 chars max)
    const fromName = invoice.from.name
      ? invoice.from.name.split(' ').slice(0, 2).join(' ').substring(0, 15)
      : 'Company'
    
    // Get short version of To name (first 2 words or 15 chars max)
    const toName = invoice.to.name
      ? invoice.to.name.split(' ').slice(0, 2).join(' ').substring(0, 15)
      : 'Client'
    
    // Format date as YYYY-MM-DD
    const dateStr = invoice.date
      ? format(new Date(invoice.date), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
    
    // Document type
    const docType = invoice.documentType === 'proforma' ? 'Proforma' : 'Invoice'
    
    // Clean and combine: FromName_to_ToName_Invoice_2024-11-18.pdf
    const cleanString = (str) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')
    
    return `${cleanString(fromName)}_to_${cleanString(toName)}_${docType}_${dateStr}.pdf`
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 md:h-screen md:max-h-screen md:overflow-hidden">
      {/* Live Preview - Left Side */}
      <div className="w-full md:w-1/2 md:h-full bg-white shadow-lg rounded-lg p-4 md:p-8 overflow-y-auto print-preview custom-scrollbar max-h-[500px] md:max-h-full">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-b-2 border-gray-800 pb-3 md:pb-4 mb-4 md:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-start gap-3 sm:gap-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              {invoice.documentType === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE'}
            </h1>
            <div className="text-left sm:text-right text-sm">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                {invoice.documentType === 'proforma' ? 'Proforma Invoice Details' : 'Invoice Details'}
              </div>
              <p className="text-gray-900 font-semibold">#{invoice.invoiceNumber || 'N/A'}</p>
              <p className="text-gray-600">{formatDateEU(invoice.date)}</p>
            </div>
          </div>

          {/* From/To Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-4 md:mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">From:</h3>
              <div className="text-xs md:text-sm text-gray-700">
                <p className="font-medium">{invoice.from.name || 'Your Company Name'}</p>
                <p>{invoice.from.address || 'Your Address'}</p>
                <p>{invoice.from.email || 'your@email.com'}</p>
                <p>{invoice.from.phone || 'Your Phone'}</p>
                <p>{invoice.from.country || 'Your Country'}</p>
                {invoice.from.piva && <p className="mt-1">P.IVA: {invoice.from.piva}</p>}
                {invoice.from.cf && <p>CF: {invoice.from.cf}</p>}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">To:</h3>
              <div className="text-xs md:text-sm text-gray-700">
                <p className="font-medium">{invoice.to.name || 'Client Name'}</p>
                <p>{invoice.to.address || 'Client Address'}</p>
                <p>{invoice.to.email || 'client@email.com'}</p>
                <p>{invoice.to.phone || 'Client Phone'}</p>
                <p>{invoice.to.country || 'Client Country'}</p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-4 md:mb-6 overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left py-2 px-2 md:px-3">Description</th>
                  <th className="text-right py-2 px-2 md:px-3">Qty</th>
                  <th className="text-right py-2 px-2 md:px-3">Unit</th>
                  <th className="text-right py-2 px-2 md:px-3">Rate</th>
                  <th className="text-right py-2 px-2 md:px-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-2 px-2 md:px-3">{item.description || '-'}</td>
                    <td className="text-right py-2 px-2 md:px-3">{item.quantity || 0}</td>
                    <td className="text-right py-2 px-2 md:px-3">{item.unit === 'None' ? '' : item.unit}</td>
                    <td className="text-right py-2 px-2 md:px-3">{formatCurrency(item.rate)}</td>
                    <td className="text-right py-2 px-2 md:px-3">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-4 md:mb-6">
            <div className="w-full sm:w-64">
              <div className="flex justify-between py-2 text-xs md:text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              {invoice.vatEnabled && (
                <div className="flex justify-between py-2 text-xs md:text-sm">
                  <span className="text-gray-600">VAT ({invoice.vatRate}%):</span>
                  <span className="font-semibold">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-gray-800 font-bold text-base md:text-lg">
                <span>Total {invoice.shippingType}:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-4 md:mb-6">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Notes:</h3>
              <p className="text-xs md:text-sm text-gray-700 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* Bank Details */}
          <div className="border-t pt-4 text-xs md:text-sm text-gray-700">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Bank Details:</h3>
            {invoice.bankDetails.bankName && <p>Bank: {invoice.bankDetails.bankName}</p>}
            <p>Account Name: {invoice.bankDetails.accountName || 'N/A'}</p>
            <p>IBAN: {invoice.bankDetails.iban || 'N/A'}</p>
            <p>BIC: {invoice.bankDetails.bic || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Editing Form - Right Side */}
      <div className="w-full md:w-1/2 md:h-full overflow-y-auto bg-gray-50 rounded-lg shadow-lg custom-scrollbar">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10 rounded-t-lg">
          <div className="px-4 md:px-8 py-4 md:py-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                {id ? 'Edit Invoice' : 'Create Invoice'}
              </h2>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Fill in the details below</p>
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-amber-600 text-xs md:text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="hidden sm:inline">Unsaved</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 md:px-8 pt-4 md:pt-6 pb-0 space-y-4 md:space-y-5">
          {/* Invoice Metadata */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 md:px-5 py-3 md:py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Invoice Details</h3>
            </div>
            <div className="p-4 md:p-5 space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Document Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setInvoice({ ...invoice, documentType: 'invoice' })}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      invoice.documentType === 'invoice' 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Invoice
                  </button>
                  <button
                    onClick={() => setInvoice({ ...invoice, documentType: 'proforma' })}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      invoice.documentType === 'proforma' 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Proforma
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {invoice.documentType === 'proforma' ? 'Proforma Number' : 'Invoice Number'}
                  </label>
                  <input
                    type="text"
                    value={invoice.invoiceNumber}
                    onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder={invoice.documentType === 'proforma' ? 'PRO-001' : 'INV-001'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={invoice.date}
                    onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Currency</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setInvoice({ ...invoice, currency: 'EUR' })}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        invoice.currency === 'EUR' 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      EUR €
                    </button>
                    <button
                      onClick={() => setInvoice({ ...invoice, currency: 'USD' })}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        invoice.currency === 'USD' 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      USD $
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Shipping</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setInvoice({ ...invoice, shippingType: 'C&F' })}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        invoice.shippingType === 'C&F' 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      C&F
                    </button>
                    <button
                      onClick={() => setInvoice({ ...invoice, shippingType: 'CIF' })}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        invoice.shippingType === 'CIF' 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      CIF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* From Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 md:px-5 py-3 md:py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">From (Your Company)</h3>
            </div>
            <div className="p-4 md:p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Supplier</label>
                <select
                  value={invoice.supplierId || ''}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white"
                >
                  <option value="">-- Select a supplier or enter manually --</option>
                  {(data?.suppliers || []).map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.email})
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={invoice.from.name}
                onChange={(e) => updateNested('from', 'name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Company Name"
              />
              <input
                type="text"
                value={invoice.from.address}
                onChange={(e) => updateNested('from', 'address', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Full Address"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="email"
                  value={invoice.from.email}
                  onChange={(e) => updateNested('from', 'email', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Email"
                />
                <input
                  type="tel"
                  value={invoice.from.phone}
                  onChange={(e) => updateNested('from', 'phone', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Phone"
                />
              </div>
              <input
                type="text"
                value={invoice.from.country}
                onChange={(e) => updateNested('from', 'country', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Country"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">P.IVA</label>
                  <input
                    type="text"
                    value={invoice.from.piva}
                    onChange={(e) => updateNested('from', 'piva', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="IT12345678901"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Tax ID</label>
                  <input
                    type="text"
                    value={invoice.from.cf}
                    onChange={(e) => updateNested('from', 'cf', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="Codice Fiscale"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* To Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 md:px-5 py-3 md:py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Bill To (Client)</h3>
            </div>
            <div className="p-4 md:p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Client</label>
                <select
                  value={invoice.clientId || ''}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white"
                >
                  <option value="">-- Select a client or enter manually --</option>
                  {(data?.clients || []).map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={invoice.to.name}
                onChange={(e) => updateNested('to', 'name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Client Name"
              />
              <input
                type="text"
                value={invoice.to.address}
                onChange={(e) => updateNested('to', 'address', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Full Address"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="email"
                  value={invoice.to.email}
                  onChange={(e) => updateNested('to', 'email', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Email"
                />
                <input
                  type="tel"
                  value={invoice.to.phone}
                  onChange={(e) => updateNested('to', 'phone', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Phone"
                />
              </div>
              <input
                type="text"
                value={invoice.to.country}
                onChange={(e) => updateNested('to', 'country', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Country"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 md:px-5 py-3 md:py-3.5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900">Line Items</h3>
              <button
                onClick={addLineItem}
                className="px-3 py-1.5 bg-gray-900 text-white rounded-md text-xs font-medium hover:bg-gray-800 transition-colors"
              >
                + Add
              </button>
            </div>
            <div className="p-4 md:p-5 space-y-3">
              {invoice.lineItems.map((item, index) => (
                <div key={index} className="relative border border-gray-200 rounded-md p-3 bg-gray-50 group">
                  {/* Floating Delete Button - Only visible on hover */}
                  {invoice.lineItems.length > 1 && (
                    <button
                      onClick={() => removeLineItem(index)}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 shadow-sm hover:shadow"
                      title="Remove item"
                    >
                      <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      placeholder="Item description"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        >
                          <option value="None">—</option>
                          <option value="KG">KG</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Rate</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateLineItem(index, 'rate', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Amount</label>
                        <input
                          type="number"
                          value={item.amount}
                          disabled
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-100 text-gray-700 font-medium"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* VAT Settings */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 md:px-5 py-3 md:py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Tax Settings</h3>
            </div>
            <div className="p-4 md:p-5 space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={invoice.vatEnabled}
                  onChange={(e) => setInvoice({ ...invoice, vatEnabled: e.target.checked })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-400 cursor-pointer"
                />
                <span className="ml-2.5 text-sm text-gray-700">Enable VAT/Tax</span>
              </label>
              {invoice.vatEnabled && (
                <div className="pt-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">VAT Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.vatRate}
                    onChange={(e) => setInvoice({ ...invoice, vatRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="e.g., 20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 md:px-5 py-3 md:py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Additional Notes</h3>
            </div>
            <div className="p-4 md:p-5">
              <textarea
                value={invoice.notes}
                onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                rows="3"
                placeholder="Payment terms, delivery instructions, etc."
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 md:px-5 py-3 md:py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Payment Information</h3>
            </div>
            <div className="p-4 md:p-5 space-y-3">
              <input
                type="text"
                value={invoice.bankDetails.bankName}
                onChange={(e) => updateNested('bankDetails', 'bankName', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Bank Name"
              />
              <input
                type="text"
                value={invoice.bankDetails.accountName}
                onChange={(e) => updateNested('bankDetails', 'accountName', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Account Holder"
              />
              <input
                type="text"
                value={invoice.bankDetails.iban}
                onChange={(e) => updateNested('bankDetails', 'iban', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="IBAN Number"
              />
              <input
                type="text"
                value={invoice.bankDetails.bic}
                onChange={(e) => updateNested('bankDetails', 'bic', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="BIC/SWIFT"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white border-t p-4 md:p-5 -mx-4 md:-mx-8 mt-4 md:mt-5 rounded-b-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={saveInvoice}
                className="px-4 py-2.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium text-sm transition-colors"
              >
                Save Invoice
              </button>
              <PDFDownloadLink
                document={(() => {
                  const supplier = data?.suppliers?.find(s => s.id === invoice.supplierId)
                  console.log('InvoiceEditor: Generating PDF')
                  console.log('InvoiceEditor: Supplier ID:', invoice.supplierId)
                  console.log('InvoiceEditor: Supplier found:', supplier ? 'Yes' : 'No')
                  console.log('InvoiceEditor: Supplier has stamp:', supplier?.stamp ? 'Yes' : 'No')
                  return <PDFDocument invoice={invoice} totals={{ subtotal, vatAmount, total }} supplier={supplier} />
                })()}
                fileName={generatePDFFilename()}
                className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium text-sm transition-colors text-center flex items-center justify-center"
              >
                Download PDF
              </PDFDownloadLink>
              <button
                onClick={() => handleNavigate('/invoices')}
                className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoiceEditor

