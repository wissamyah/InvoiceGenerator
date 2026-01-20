import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import db from '../lib/instantdb'
import { useModal } from '../contexts/ModalContext'

const SupplierList = () => {
  const navigate = useNavigate()
  const { data, isLoading } = db.useQuery({ suppliers: {} })
  const { showPasswordPrompt } = useModal()

  const deleteSupplier = async (id) => {
    const password = await showPasswordPrompt(
      'Delete Supplier',
      'Enter password to confirm deletion:'
    )
    if (password === 'ADMIN') {
      try {
        await db.transact([
          db.tx.suppliers[id].delete()
        ])
        toast.success('Supplier deleted successfully.')
      } catch (error) {
        console.error('Error deleting supplier:', error)
        toast.error('Error deleting supplier. Please try again.')
      }
    } else if (password) {
      toast.error('Incorrect password.')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-600">Loading suppliers...</div>
      </div>
    )
  }

  const suppliers = data?.suppliers || []

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Suppliers</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/management/clients')}
              className="w-full sm:w-auto px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 font-medium text-sm transition-colors"
            >
              View Clients
            </button>
            <button
              onClick={() => navigate('/management/suppliers/editor')}
              className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium text-sm transition-colors"
            >
              Add New Supplier
            </button>
          </div>
        </div>

        {suppliers.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12 text-center">
            <p className="text-gray-600 text-sm md:text-base mb-4">No suppliers yet</p>
            <button
              onClick={() => navigate('/management/suppliers/editor')}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium text-sm transition-colors"
            >
              Add Your First Supplier
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  onClick={() => navigate(`/management/suppliers/editor/${supplier.id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {supplier.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-600">{supplier.email || 'No email'}</p>
                  </div>
                  
                  <div className="space-y-1.5 mb-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Address:</span>
                      <span className="text-gray-900 text-right max-w-[60%] truncate">{supplier.address || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="text-gray-900">{supplier.phone || 'N/A'}</span>
                    </div>
                    {supplier.vatNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">VAT:</span>
                        <span className="text-gray-900">{supplier.vatNumber}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/inspection/suppliers/editor/${supplier.id}`)
                      }}
                      className="flex-1 px-3 py-2 text-center text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md font-medium text-xs transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSupplier(supplier.id)
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
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Address</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Phone</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">VAT Number</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/management/suppliers/editor/${supplier.id}`)}
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {supplier.name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {supplier.address || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{supplier.email || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{supplier.phone || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{supplier.vatNumber || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/management/suppliers/editor/${supplier.id}`)
                            }}
                            className="px-3 py-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md font-medium text-xs transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSupplier(supplier.id)
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

export default SupplierList

