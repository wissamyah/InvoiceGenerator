import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { PDFDownloadLink } from '@react-pdf/renderer'
import db from '../lib/instantdb'
import PDFDocument from './PDFDocument'

const InvoiceList = () => {
  const navigate = useNavigate()
  const { data, isLoading } = db.useQuery({ invoices: {} })

  const deleteInvoice = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await db.transact([
          db.tx.invoices[id].delete()
        ])
      } catch (error) {
        console.error('Error deleting invoice:', error)
        alert('Error deleting invoice. Please try again.')
      }
    }
  }

  const formatCurrency = (amount, currency) => {
    const symbol = currency === 'EUR' ? '€' : '$'
    const numAmount = parseFloat(amount) || 0
    return `${symbol}${numAmount.toFixed(2)}`
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
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">All Invoices</h1>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-blue-700 font-semibold"
          >
            Create New Invoice
          </button>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">No invoices yet</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
            >
              Create Your First Invoice
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="text-left py-3 px-4">Invoice #</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Client Name</th>
                  <th className="text-right py-3 px-4">Total</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td 
                      className="py-3 px-4 font-medium cursor-pointer hover:text-primary"
                      onClick={() => navigate(`/edit/${invoice.id}`)}
                    >
                      {invoice.invoiceNumber || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        invoice.documentType === 'proforma' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {invoice.documentType === 'proforma' ? 'Proforma' : 'Invoice'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {invoice.date ? format(new Date(invoice.date), 'dd/MM/yyyy') : 'N/A'}
                    </td>
                    <td className="py-3 px-4">{invoice.to?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(calculateTotal(invoice), invoice.currency || 'EUR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <PDFDownloadLink
                          document={<PDFDocument invoice={invoice} totals={calculateTotals(invoice)} />}
                          fileName={generatePDFFilename(invoice)}
                          className="px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded font-medium text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {({ loading }) => (loading ? 'Loading...' : 'PDF')}
                        </PDFDownloadLink>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteInvoice(invoice.id)
                          }}
                          className="px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded font-medium text-sm"
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
        )}
      </div>
    </div>
  )
}

export default InvoiceList

