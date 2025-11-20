import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import db, { id as generateId } from '../lib/instantdb'
import { useUnsavedChanges } from '../App'
import { useModal } from '../contexts/ModalContext'

const ClientEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data } = db.useQuery({ clients: {}, suppliers: {}, clientSupplierLicenses: {} })
  const initialClientRef = useRef(null)
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges()
  const { showAlert, showConfirm } = useModal()
  const [isLoaded, setIsLoaded] = useState(false)
  const [expandedSuppliers, setExpandedSuppliers] = useState({})
  const [newLicenseInputs, setNewLicenseInputs] = useState({})

  const [client, setClient] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    email: '',
    phone: ''
  })

  useEffect(() => {
    if (id && data?.clients) {
      const existingClient = data.clients.find(c => c.id === id)
      if (existingClient) {
        setClient(existingClient)
        initialClientRef.current = JSON.stringify(existingClient)
        setIsLoaded(true)
      }
    } else {
      initialClientRef.current = JSON.stringify(client)
      setIsLoaded(true)
    }
  }, [id, data])

  useEffect(() => {
    if (isLoaded) {
      const currentClient = JSON.stringify(client)
      const hasChanges = currentClient !== initialClientRef.current
      setHasUnsavedChanges(hasChanges)
    }
  }, [client, isLoaded, setHasUnsavedChanges])

  const handleInputChange = (field, value) => {
    setClient(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    // Validation
    if (!client.name?.trim()) {
      showAlert('Validation Error', 'Client name is required.', 'error')
      return
    }

    try {
      if (id) {
        // Update existing client
        await db.transact([
          db.tx.clients[id].update(client)
        ])
        showAlert('Success', 'Client updated successfully.', 'success')
      } else {
        // Create new client
        const newId = generateId()
        await db.transact([
          db.tx.clients[newId].update(client)
        ])
        showAlert('Success', 'Client created successfully.', 'success')
      }
      
      initialClientRef.current = JSON.stringify(client)
      setHasUnsavedChanges(false)
      
      setTimeout(() => {
        navigate('/management/clients')
      }, 500)
    } catch (error) {
      console.error('Error saving client:', error)
      showAlert('Error', 'Error saving client. Please try again.', 'error')
    }
  }

  const handleCancel = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await showConfirm(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?'
      )
      if (!confirmed) return
    }
    navigate('/management/clients')
  }

  // License management functions
  const suppliers = data?.suppliers || []
  const clientSupplierLicenses = data?.clientSupplierLicenses || []
  
  const getLicensesForSupplier = (supplierId) => {
    return clientSupplierLicenses.filter(
      license => license.clientId === id && license.supplierId === supplierId
    )
  }

  const toggleSupplierExpanded = (supplierId) => {
    setExpandedSuppliers(prev => ({
      ...prev,
      [supplierId]: !prev[supplierId]
    }))
  }

  const handleAddLicense = async (supplierId) => {
    const licenseNumber = newLicenseInputs[supplierId]?.trim()
    
    if (!licenseNumber) {
      showAlert('Validation Error', 'License number is required.', 'error')
      return
    }

    if (!id) {
      showAlert('Save Client First', 'Please save the client before adding licenses.', 'error')
      return
    }

    try {
      const newId = generateId()
      await db.transact([
        db.tx.clientSupplierLicenses[newId].update({
          clientId: id,
          supplierId: supplierId,
          licenseNumber: licenseNumber
        })
      ])
      
      // Clear input
      setNewLicenseInputs(prev => ({
        ...prev,
        [supplierId]: ''
      }))
      
      showAlert('Success', 'License added successfully.', 'success')
    } catch (error) {
      console.error('Error adding license:', error)
      showAlert('Error', 'Error adding license. Please try again.', 'error')
    }
  }

  const handleDeleteLicense = async (licenseId) => {
    const confirmed = await showConfirm(
      'Delete License',
      'Are you sure you want to delete this license?'
    )
    
    if (!confirmed) return

    try {
      await db.transact([
        db.tx.clientSupplierLicenses[licenseId].delete()
      ])
      showAlert('Success', 'License deleted successfully.', 'success')
    } catch (error) {
      console.error('Error deleting license:', error)
      showAlert('Error', 'Error deleting license. Please try again.', 'error')
    }
  }

  const handleLicenseInputChange = (supplierId, value) => {
    setNewLicenseInputs(prev => ({
      ...prev,
      [supplierId]: value
    }))
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6">
            {id ? 'Edit Client' : 'New Client'}
          </h1>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={client.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={client.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={client.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="+243 123 456 789"
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Address Information</h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={client.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Street address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={client.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Matadi"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={client.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Democratic Republic of Congo"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Licenses per Supplier */}
            {id && (
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Licenses per Supplier</h2>
                
                {suppliers.length === 0 ? (
                  <p className="text-sm text-gray-500">No suppliers available. Please create suppliers first.</p>
                ) : (
                  <div className="space-y-3">
                    {suppliers.map((supplier) => {
                      const licenses = getLicensesForSupplier(supplier.id)
                      const isExpanded = expandedSuppliers[supplier.id]
                      
                      return (
                        <div key={supplier.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleSupplierExpanded(supplier.id)}
                            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-900">{supplier.name}</span>
                              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                                {licenses.length} {licenses.length === 1 ? 'license' : 'licenses'}
                              </span>
                            </div>
                            <svg
                              className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {isExpanded && (
                            <div className="p-4 bg-white">
                              {/* Existing licenses */}
                              {licenses.length > 0 && (
                                <div className="space-y-2 mb-4">
                                  {licenses.map((license) => (
                                    <div
                                      key={license.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                                    >
                                      <span className="text-sm text-gray-900 font-mono">{license.licenseNumber}</span>
                                      <button
                                        onClick={() => handleDeleteLicense(license.id)}
                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Add new license */}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newLicenseInputs[supplier.id] || ''}
                                  onChange={(e) => handleLicenseInputChange(supplier.id, e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddLicense(supplier.id)
                                    }
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                                  placeholder="Enter new license number"
                                />
                                <button
                                  onClick={() => handleAddLicense(supplier.id)}
                                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-medium transition-colors"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            
            {!id && (
              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-500 italic">
                  Save the client first to manage licenses per supplier.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="w-full sm:w-auto px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium transition-colors"
              >
                {id ? 'Update Client' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientEditor

