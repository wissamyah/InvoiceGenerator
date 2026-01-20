import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { PDFDownloadLink } from '@react-pdf/renderer'
import db from '../lib/instantdb'
import InspectionPDFDocument from './InspectionPDFDocument'
import { useModal } from '../contexts/ModalContext'

const InspectionRequestList = () => {
  const navigate = useNavigate()
  const { data, isLoading } = db.useQuery({ inspectionRequests: {}, suppliers: {}, clients: {} })
  const { showPasswordPrompt } = useModal()

  const deleteRequest = async (id) => {
    const password = await showPasswordPrompt(
      'Delete Inspection Request',
      'Enter password to confirm deletion:'
    )
    if (password === 'ADMIN') {
      try {
        await db.transact([
          db.tx.inspectionRequests[id].delete()
        ])
        toast.success('Inspection request deleted successfully.')
      } catch (error) {
        console.error('Error deleting inspection request:', error)
        toast.error('Error deleting inspection request. Please try again.')
      }
    } else if (password) {
      toast.error('Incorrect password.')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-600">Loading inspection requests...</div>
      </div>
    )
  }

  const requests = data?.inspectionRequests || []
  const suppliers = data?.suppliers || []
  const clients = data?.clients || []

  // Helper to get supplier/client by ID
  const getSupplier = (id) => suppliers.find(s => s.id === id)
  const getClient = (id) => clients.find(c => c.id === id)

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Inspection Requests</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => navigate('/inspection/requests/editor')}
              className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium text-sm transition-colors"
            >
              Create New Request
            </button>
        </div>
      </div>

      {requests.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12 text-center">
            <p className="text-gray-600 text-sm md:text-base mb-4">No inspection requests yet</p>
            <button
              onClick={() => navigate('/inspection/requests/editor')}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium text-sm transition-colors"
            >
              Create Your First Request
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {requests.map((request) => {
                const supplier = getSupplier(request.supplierId)
                const client = getClient(request.clientId)
                
                return (
                  <div
                    key={request.id}
                    onClick={() => navigate(`/inspection/requests/editor/${request.id}`)}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {client?.name || 'Unknown Client'}
                        </p>
                        <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                          {request.containerType}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 mb-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Supplier:</span>
                        <span className="text-gray-900 font-medium">{supplier?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Inspection:</span>
                        <span className="text-gray-900">
                          {request.inspectionDate ? format(new Date(request.inspectionDate), 'dd/MM/yyyy') : 'N/A'} at {request.inspectionTime || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created:</span>
                        <span className="text-gray-900">
                          {request.createdAt ? format(new Date(request.createdAt), 'dd/MM/yyyy') : 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <PDFDownloadLink
                        document={
                          <InspectionPDFDocument 
                            request={request}
                            supplier={supplier}
                            client={client}
                          />
                        }
                        fileName={`Inspection_Request_${client?.name?.replace(/\s+/g, '_')}_${request.inspectionDate}.pdf`}
                        className="flex-1 px-3 py-2 text-center text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md font-medium text-xs transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {({ loading }) => (loading ? 'Loading...' : 'Download PDF')}
                      </PDFDownloadLink>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteRequest(request.id)
                        }}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Client</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Supplier</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Container Type</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Inspection Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Created</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const supplier = getSupplier(request.supplierId)
                    const client = getClient(request.clientId)
                    
                    return (
                      <tr
                        key={request.id}
                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/inspection/requests/editor/${request.id}`)}
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {client?.name || 'Unknown Client'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {supplier?.name || 'Unknown Supplier'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                            {request.containerType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {request.inspectionDate ? format(new Date(request.inspectionDate), 'dd/MM/yyyy') : 'N/A'} at {request.inspectionTime || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {request.createdAt ? format(new Date(request.createdAt), 'dd/MM/yyyy') : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <PDFDownloadLink
                              document={
                                <InspectionPDFDocument 
                                  request={request}
                                  supplier={supplier}
                                  client={client}
                                />
                              }
                              fileName={`Inspection_Request_${client?.name?.replace(/\s+/g, '_')}_${request.inspectionDate}.pdf`}
                              className="px-3 py-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md font-medium text-xs transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {({ loading }) => (loading ? 'Loading...' : 'PDF')}
                            </PDFDownloadLink>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteRequest(request.id)
                              }}
                              className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md font-medium text-xs transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default InspectionRequestList

