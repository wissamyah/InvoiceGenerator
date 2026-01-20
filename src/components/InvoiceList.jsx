import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { PDFDownloadLink } from '@react-pdf/renderer'
import db from '../lib/instantdb'
import PDFDocument from './PDFDocument'
import { useModal } from '../contexts/ModalContext'

const InvoiceList = () => {
  const navigate = useNavigate()
  const { data, isLoading } = db.useQuery({ invoices: {}, suppliers: {} })
  const { showPasswordPrompt } = useModal()

  const deleteInvoice = async (id) => {
    const password = await showPasswordPrompt(
      'Delete Invoice',
      'Enter password to confirm deletion:'
    )
    if (password === 'ADMIN') {
      try {
        await db.transact([
          db.tx.invoices[id].delete()
        ])
        toast.success('Invoice deleted successfully.')
      } catch (error) {
        console.error('Error deleting invoice:', error)
        toast.error('Error deleting invoice. Please try again.')
      }
    } else if (password) {
      toast.error('Incorrect password.')
    }
  }

  const formatCurrency = (amount, currency) => {
    const symbol = currency === 'EUR' ? '€' : '$'
    const numAmount = parseFloat(amount) || 0
    return `${symbol}${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const calculateTotal = (invoice) => {
    if (!invoice.lineItems || invoice.lineItems.length === 0) return 0
    const subtotal = invoice.lineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0
      return sum + amount
    }, 0)
    const vatAmount = invoice.vatEnabled ? (subtotal * (parseFloat(invoice.vatRate) || 0) / 100) : 0
    return subtotal + vatAmount
  }

  const calculateTotals = (invoice) => {
    if (!invoice.lineItems || invoice.lineItems.length === 0) {
      return { subtotal: 0, vatAmount: 0, total: 0 }
    }
    const subtotal = invoice.lineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0
      return sum + amount
    }, 0)
    const vatAmount = invoice.vatEnabled ? (subtotal * (parseFloat(invoice.vatRate) || 0) / 100) : 0
    const total = subtotal + vatAmount
    return { subtotal, vatAmount, total }
  }

  // Generate professional filename for PDF
  const generatePDFFilename = (invoice) => {
    // Get short version of From name (first 2 words or 15 chars max)
    const fromName = invoice.from?.name
      ? invoice.from.name.split(' ').slice(0, 2).join(' ').substring(0, 15)
      : 'Company'
    
    // Get short version of To name (first 2 words or 15 chars max)
    const toName = invoice.to?.name
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-600">Loading invoices...</div>
      </div>
    )
  }

  const invoices = data?.invoices || []

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">All Invoices</h1>
          <button
            onClick={() => navigate('/invoices/editor')}
            className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium text-sm transition-colors"
          >
            Create New Invoice
          </button>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12 text-center">
            <p className="text-gray-600 text-sm md:text-base mb-4">No invoices yet</p>
            <button
              onClick={() => navigate('/invoices/editor')}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium text-sm transition-colors"
            >
              Create Your First Invoice
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => navigate(`/invoices/editor/${invoice.id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        #{invoice.invoiceNumber || 'N/A'}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${
                        invoice.documentType === 'proforma' 
                          ? 'bg-gray-100 text-gray-700' 
                          : 'bg-gray-900 text-white'
                      }`}>
                        {invoice.documentType === 'proforma' ? 'Proforma' : 'Invoice'}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(calculateTotal(invoice), invoice.currency || 'EUR')}
                    </p>
                  </div>
                  
                  <div className="space-y-1.5 mb-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">From:</span>
                      <span className="text-gray-900 font-medium">{invoice.from?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Client:</span>
                      <span className="text-gray-900 font-medium">{invoice.to?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date:</span>
                      <span className="text-gray-900">{invoice.date ? format(new Date(invoice.date), 'dd/MM/yyyy') : 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <PDFDownloadLink
                      document={
                        <PDFDocument 
                          invoice={invoice} 
                          totals={calculateTotals(invoice)} 
                          supplier={data?.suppliers?.find(s => s.id === invoice.supplierId)} 
                        />
                      }
                      fileName={generatePDFFilename(invoice)}
                      className="flex-1 px-3 py-2 text-center text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md font-medium text-xs transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {({ loading }) => (loading ? 'Loading...' : 'Download PDF')}
                    </PDFDownloadLink>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteInvoice(invoice.id)
                      }}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Invoice #</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">From</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Client</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase">Total</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/invoices/editor/${invoice.id}`)}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        invoice.documentType === 'proforma' 
                          ? 'bg-gray-100 text-gray-700' 
                          : 'bg-gray-900 text-white'
                      }`}>
                        {invoice.documentType === 'proforma' ? 'Proforma' : 'Invoice'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {invoice.date ? format(new Date(invoice.date), 'dd/MM/yyyy') : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{invoice.from?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{invoice.to?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(calculateTotal(invoice), invoice.currency || 'EUR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <PDFDownloadLink
                          document={
                            <PDFDocument 
                              invoice={invoice} 
                              totals={calculateTotals(invoice)} 
                              supplier={data?.suppliers?.find(s => s.id === invoice.supplierId)} 
                            />
                          }
                          fileName={generatePDFFilename(invoice)}
                          className="px-3 py-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md font-medium text-xs transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {({ loading }) => (loading ? 'Loading...' : 'PDF')}
                        </PDFDownloadLink>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteInvoice(invoice.id)
                          }}
                          className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md font-medium text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  )
}

export default InvoiceList

