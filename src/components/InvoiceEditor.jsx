import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import db, { id as generateId } from '../lib/instantdb'
import { PDFDownloadLink } from '@react-pdf/renderer'
import PDFDocument from './PDFDocument'
import { useUnsavedChanges } from '../App'

const InvoiceEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { data } = db.useQuery({ invoices: {} })
  const initialInvoiceRef = useRef(null)
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges()
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

  // Check if invoice has any user-entered data
  const hasFormData = useCallback(() => {
    // Check if any field has been filled in
    const hasInvoiceDetails = invoice.invoiceNumber !== ''
    const hasFromData = Object.values(invoice.from).some(val => val !== '')
    const hasToData = Object.values(invoice.to).some(val => val !== '')
    const hasBankData = Object.values(invoice.bankDetails).some(val => val !== '')
    const hasNotes = invoice.notes !== ''
    const hasLineItemData = invoice.lineItems.some(item => 
      item.description !== '' || item.quantity > 0 || item.rate > 0
    )
    
    return hasInvoiceDetails || hasFromData || hasToData || hasBankData || hasNotes || hasLineItemData
  }, [invoice])

  // Track if there are unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(hasFormData())
  }, [invoice, hasFormData])

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
  const handleNavigate = useCallback((path) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
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
  }, [hasUnsavedChanges, navigate])

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
        alert('Invoice updated successfully!')
      } else {
        // Create new invoice
        await db.transact([
          db.tx.invoices[generateId()].update(invoice)
        ])
        setHasUnsavedChanges(false) // Clear unsaved changes flag
        setIsNavigating(true)
        alert('Invoice created successfully!')
        navigate('/invoices')
      }
    } catch (error) {
      console.error('Error saving invoice:', error)
      alert('Error saving invoice. Please try again.')
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
    <div className="flex gap-6 p-6 h-screen overflow-hidden">
      {/* Live Preview - Left Side */}
      <div className="w-1/2 bg-white shadow-lg rounded-lg p-8 overflow-y-auto print-preview">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-start">
            <h1 className="text-4xl font-bold text-gray-900">
              {invoice.documentType === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE'}
            </h1>
            <div className="text-right text-sm">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                {invoice.documentType === 'proforma' ? 'Proforma Invoice Details' : 'Invoice Details'}
              </div>
              <p className="text-gray-900 font-semibold">#{invoice.invoiceNumber || 'N/A'}</p>
              <p className="text-gray-600">{formatDateEU(invoice.date)}</p>
            </div>
          </div>

          {/* From/To Section */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">From:</h3>
              <div className="text-sm text-gray-700">
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
              <h3 className="font-semibold text-gray-900 mb-2">To:</h3>
              <div className="text-sm text-gray-700">
                <p className="font-medium">{invoice.to.name || 'Client Name'}</p>
                <p>{invoice.to.address || 'Client Address'}</p>
                <p>{invoice.to.email || 'client@email.com'}</p>
                <p>{invoice.to.phone || 'Client Phone'}</p>
                <p>{invoice.to.country || 'Client Country'}</p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left py-2 px-3">Description</th>
                  <th className="text-right py-2 px-3">Qty</th>
                  <th className="text-right py-2 px-3">Unit</th>
                  <th className="text-right py-2 px-3">Rate</th>
                  <th className="text-right py-2 px-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-2 px-3">{item.description || '-'}</td>
                    <td className="text-right py-2 px-3">{item.quantity || 0}</td>
                    <td className="text-right py-2 px-3">{item.unit === 'None' ? '' : item.unit}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(item.rate)}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              {invoice.vatEnabled && (
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-600">VAT ({invoice.vatRate}%):</span>
                  <span className="font-semibold">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-gray-800 font-bold text-lg">
                <span>Total {invoice.shippingType}:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Notes:</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* Bank Details */}
          <div className="border-t pt-4 text-sm text-gray-700">
            <h3 className="font-semibold text-gray-900 mb-2">Bank Details:</h3>
            {invoice.bankDetails.bankName && <p>Bank: {invoice.bankDetails.bankName}</p>}
            <p>Account Name: {invoice.bankDetails.accountName || 'N/A'}</p>
            <p>IBAN: {invoice.bankDetails.iban || 'N/A'}</p>
            <p>BIC: {invoice.bankDetails.bic || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Editing Form - Right Side */}
      <div className="w-1/2 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-blue-600 text-white p-6 sticky top-0 z-10 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {id ? 'Edit Invoice' : 'Create New Invoice'}
              </h2>
              <p className="text-blue-100 text-sm mt-1">Fill in the details below</p>
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Unsaved Changes
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Invoice Metadata */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm mr-3">1</span>
                Invoice Details
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Document Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setInvoice({ ...invoice, documentType: 'invoice' })}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      invoice.documentType === 'invoice' 
                        ? 'bg-primary text-white shadow-md transform scale-105' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Invoice
                  </button>
                  <button
                    onClick={() => setInvoice({ ...invoice, documentType: 'proforma' })}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      invoice.documentType === 'proforma' 
                        ? 'bg-primary text-white shadow-md transform scale-105' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Proforma Invoice
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    {invoice.documentType === 'proforma' ? 'Proforma Invoice Number' : 'Invoice Number'}
                  </label>
                  <input
                    type="text"
                    value={invoice.invoiceNumber}
                    onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder={invoice.documentType === 'proforma' ? 'PRO-001' : 'INV-001'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Date</label>
                  <input
                    type="date"
                    value={invoice.date}
                    onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Currency</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setInvoice({ ...invoice, currency: 'EUR' })}
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${
                        invoice.currency === 'EUR' 
                          ? 'bg-primary text-white shadow-md transform scale-105' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      EUR €
                    </button>
                    <button
                      onClick={() => setInvoice({ ...invoice, currency: 'USD' })}
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${
                        invoice.currency === 'USD' 
                          ? 'bg-primary text-white shadow-md transform scale-105' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      USD $
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Shipping Terms</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setInvoice({ ...invoice, shippingType: 'C&F' })}
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${
                        invoice.shippingType === 'C&F' 
                          ? 'bg-primary text-white shadow-md transform scale-105' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      C&F
                    </button>
                    <button
                      onClick={() => setInvoice({ ...invoice, shippingType: 'CIF' })}
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${
                        invoice.shippingType === 'CIF' 
                          ? 'bg-primary text-white shadow-md transform scale-105' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm mr-3">2</span>
                From (Your Company)
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={invoice.from.name}
                onChange={(e) => updateNested('from', 'name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Company Name"
              />
              <input
                type="text"
                value={invoice.from.address}
                onChange={(e) => updateNested('from', 'address', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Full Address"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="email"
                  value={invoice.from.email}
                  onChange={(e) => updateNested('from', 'email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Email Address"
                />
                <input
                  type="tel"
                  value={invoice.from.phone}
                  onChange={(e) => updateNested('from', 'phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Phone Number"
                />
              </div>
              <input
                type="text"
                value={invoice.from.country}
                onChange={(e) => updateNested('from', 'country', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Country"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">P.IVA (VAT Number)</label>
                  <input
                    type="text"
                    value={invoice.from.piva}
                    onChange={(e) => updateNested('from', 'piva', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="IT12345678901"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">CF (Tax ID)</label>
                  <input
                    type="text"
                    value={invoice.from.cf}
                    onChange={(e) => updateNested('from', 'cf', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Codice Fiscale"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* To Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm mr-3">3</span>
                Bill To (Client)
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={invoice.to.name}
                onChange={(e) => updateNested('to', 'name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Client Name"
              />
              <input
                type="text"
                value={invoice.to.address}
                onChange={(e) => updateNested('to', 'address', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Full Address"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="email"
                  value={invoice.to.email}
                  onChange={(e) => updateNested('to', 'email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Email Address"
                />
                <input
                  type="tel"
                  value={invoice.to.phone}
                  onChange={(e) => updateNested('to', 'phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Phone Number"
                />
              </div>
              <input
                type="text"
                value={invoice.to.country}
                onChange={(e) => updateNested('to', 'country', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Country"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm mr-3">4</span>
                Line Items
              </h3>
              <button
                onClick={addLineItem}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
              >
                + Add Item
              </button>
            </div>
            <div className="p-6 space-y-4">
              {invoice.lineItems.map((item, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="Item description..."
                    />
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                        >
                          <option value="None">None</option>
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Amount</label>
                        <input
                          type="number"
                          value={item.amount}
                          disabled
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    {invoice.lineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(index)}
                        className="text-red-600 text-sm font-medium hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded transition-colors"
                      >
                        × Remove Item
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* VAT Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm mr-3">5</span>
                Tax Settings
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={invoice.vatEnabled}
                  onChange={(e) => setInvoice({ ...invoice, vatEnabled: e.target.checked })}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                />
                <span className="ml-3 text-sm font-medium text-gray-900">Enable VAT/Tax</span>
              </label>
              {invoice.vatEnabled && (
                <div className="pl-8 pt-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">VAT Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoice.vatRate}
                    onChange={(e) => setInvoice({ ...invoice, vatRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="e.g., 20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm mr-3">6</span>
                Additional Notes
              </h3>
            </div>
            <div className="p-6">
              <textarea
                value={invoice.notes}
                onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                rows="4"
                placeholder="Payment terms, delivery instructions, or any other relevant information..."
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm mr-3">7</span>
                Payment Information
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={invoice.bankDetails.bankName}
                onChange={(e) => updateNested('bankDetails', 'bankName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Bank Name"
              />
              <input
                type="text"
                value={invoice.bankDetails.accountName}
                onChange={(e) => updateNested('bankDetails', 'accountName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Account Holder Name"
              />
              <input
                type="text"
                value={invoice.bankDetails.iban}
                onChange={(e) => updateNested('bankDetails', 'iban', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="IBAN Number"
              />
              <input
                type="text"
                value={invoice.bankDetails.bic}
                onChange={(e) => updateNested('bankDetails', 'bic', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="BIC/SWIFT Code"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 -mx-6 shadow-lg">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={saveInvoice}
                className="px-6 py-4 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                💾 Save Invoice
              </button>
              <PDFDownloadLink
                document={<PDFDocument invoice={invoice} totals={{ subtotal, vatAmount, total }} />}
                fileName={generatePDFFilename()}
                className="px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-xl hover:from-gray-800 hover:to-black font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 text-center flex items-center justify-center"
              >
                📄 Download PDF
              </PDFDownloadLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoiceEditor

