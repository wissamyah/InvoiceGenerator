import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import db, { id as generateId } from '../lib/instantdb'
import { PDFDownloadLink } from '@react-pdf/renderer'
import InspectionPDFDocument from './InspectionPDFDocument'
import { useUnsavedChanges } from '../App'
import { useModal } from '../contexts/ModalContext'

const InspectionRequestEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data } = db.useQuery({ inspectionRequests: {}, suppliers: {}, clients: {}, clientSupplierLicenses: {} })
  const initialRequestRef = useRef(null)
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges()
  const { showAlert, showConfirm } = useModal()
  const [isLoaded, setIsLoaded] = useState(false)
  const [showNewLicenseInput, setShowNewLicenseInput] = useState(false)
  const [newLicenseValue, setNewLicenseValue] = useState('')

  const [request, setRequest] = useState({
    supplierId: '',
    clientId: '',
    licenseNumber: '',
    containerType: "40' dry high cube",
    inspectionDate: format(new Date(), 'yyyy-MM-dd'),
    inspectionTime: '08:00',
    createdAt: new Date().toISOString()
  })

  useEffect(() => {
    if (id && data?.inspectionRequests) {
      const existingRequest = data.inspectionRequests.find(r => r.id === id)
      if (existingRequest) {
        setRequest(existingRequest)
        initialRequestRef.current = JSON.stringify(existingRequest)
        setIsLoaded(true)
      }
    } else {
      initialRequestRef.current = JSON.stringify(request)
      setIsLoaded(true)
    }
  }, [id, data])

  useEffect(() => {
    if (isLoaded) {
      const currentRequest = JSON.stringify(request)
      const hasChanges = currentRequest !== initialRequestRef.current
      setHasUnsavedChanges(hasChanges)
    }
  }, [request, isLoaded, setHasUnsavedChanges])

  const handleInputChange = (field, value) => {
    setRequest(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    // Validation
    if (!request.supplierId) {
      showAlert('Validation Error', 'Please select a supplier.', 'error')
      return
    }
    if (!request.clientId) {
      showAlert('Validation Error', 'Please select a client.', 'error')
      return
    }
    if (!request.licenseNumber) {
      showAlert('Validation Error', 'Please select or enter a license number.', 'error')
      return
    }
    if (!request.inspectionDate) {
      showAlert('Validation Error', 'Inspection date is required.', 'error')
      return
    }
    if (!request.inspectionTime) {
      showAlert('Validation Error', 'Inspection time is required.', 'error')
      return
    }

    try {
      if (id) {
        // Update existing request
        await db.transact([
          db.tx.inspectionRequests[id].update(request)
        ])
        showAlert('Success', 'Inspection request updated successfully.', 'success')
      } else {
        // Create new request
        const newId = generateId()
        await db.transact([
          db.tx.inspectionRequests[newId].update({
            ...request,
            createdAt: new Date().toISOString()
          })
        ])
        showAlert('Success', 'Inspection request created successfully.', 'success')
      }
      
      initialRequestRef.current = JSON.stringify(request)
      setHasUnsavedChanges(false)
      
      setTimeout(() => {
        navigate('/inspection/requests')
      }, 500)
    } catch (error) {
      console.error('Error saving inspection request:', error)
      showAlert('Error', 'Error saving inspection request. Please try again.', 'error')
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
    navigate('/inspection/requests')
  }

  const suppliers = data?.suppliers || []
  const clients = data?.clients || []
  const clientSupplierLicenses = data?.clientSupplierLicenses || []
  const selectedSupplier = suppliers.find(s => s.id === request.supplierId)
  const selectedClient = clients.find(c => c.id === request.clientId)

  // Get available licenses for the selected client-supplier combination
  const availableLicenses = clientSupplierLicenses.filter(
    license => license.clientId === request.clientId && license.supplierId === request.supplierId
  )

  const handleAddNewLicense = async () => {
    const licenseNumber = newLicenseValue.trim()
    
    if (!licenseNumber) {
      showAlert('Validation Error', 'License number is required.', 'error')
      return
    }

    if (!request.clientId || !request.supplierId) {
      showAlert('Validation Error', 'Please select a client and supplier first.', 'error')
      return
    }

    try {
      const newId = generateId()
      await db.transact([
        db.tx.clientSupplierLicenses[newId].update({
          clientId: request.clientId,
          supplierId: request.supplierId,
          licenseNumber: licenseNumber
        })
      ])
      
      // Set the newly created license as selected
      handleInputChange('licenseNumber', licenseNumber)
      
      // Reset the input state
      setNewLicenseValue('')
      setShowNewLicenseInput(false)
      
      showAlert('Success', 'License added successfully.', 'success')
    } catch (error) {
      console.error('Error adding license:', error)
      showAlert('Error', 'Error adding license. Please try again.', 'error')
    }
  }

  // Generate preview text in Italian
  const generatePreviewText = () => {
    if (!selectedSupplier || !selectedClient) {
      return 'Please select a supplier and client to see the preview.'
    }

    const dateObj = new Date(request.inspectionDate + 'T' + request.inspectionTime)
    const dayNumber = format(dateObj, 'dd')
    const year = format(dateObj, 'yyyy')
    const time = request.inspectionTime

    // Italian day names mapping
    const italianDays = {
      'Monday': 'lunedì',
      'Tuesday': 'martedì',
      'Wednesday': 'mercoledì',
      'Thursday': 'giovedì',
      'Friday': 'venerdì',
      'Saturday': 'sabato',
      'Sunday': 'domenica'
    }

    // Italian month names mapping
    const italianMonths = {
      'January': 'gennaio',
      'February': 'febbraio',
      'March': 'marzo',
      'April': 'aprile',
      'May': 'maggio',
      'June': 'giugno',
      'July': 'luglio',
      'August': 'agosto',
      'September': 'settembre',
      'October': 'ottobre',
      'November': 'novembre',
      'December': 'dicembre'
    }

    const italianDay = italianDays[format(dateObj, 'EEEE')] || format(dateObj, 'EEEE').toLowerCase()
    const italianMonth = italianMonths[format(dateObj, 'MMMM')] || format(dateObj, 'MMMM').toLowerCase()

    return `RICHIESTA ISPEZIONE

Richiedo ispezione per un container ${request.containerType} destinato alla ditta ${selectedClient.name} - ${selectedClient.city || 'Matadi'} - ${selectedClient.country || 'Democratic Republic of Congo'}, con numero di licenza ${request.licenseNumber || 'N/A'}.

Il container si carica presso ${selectedSupplier.name} in ${selectedSupplier.address} - ${selectedSupplier.zipCode || ''} ${selectedSupplier.city || ''} (${selectedSupplier.country || ''}) - il ${italianDay} ${dayNumber} di ${italianMonth} ${year} alle ${time}.

Allegato:
Fattura Proforma
Licenza ${request.licenseNumber || 'N/A'}
Request for information`
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              {id ? 'Edit Inspection Request' : 'New Inspection Request'}
            </h1>
            {request.supplierId && request.clientId && (
              <PDFDownloadLink
                document={
                  <InspectionPDFDocument 
                    request={request}
                    supplier={selectedSupplier}
                    client={selectedClient}
                  />
                }
                fileName={`Inspection_Request_${selectedClient?.name?.replace(/\s+/g, '_')}_${request.inspectionDate}.pdf`}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm transition-colors"
              >
                {({ loading }) => (loading ? 'Generating...' : 'Download PDF')}
              </PDFDownloadLink>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  value={request.supplierId}
                  onChange={(e) => handleInputChange('supplierId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    No suppliers available. <button
                      onClick={() => navigate('/inspection/suppliers/editor')}
                      className="text-blue-600 hover:underline"
                    >
                      Add one now
                    </button>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={request.clientId}
                  onChange={(e) => {
                    handleInputChange('clientId', e.target.value)
                    handleInputChange('licenseNumber', '')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    No clients available. <button
                      onClick={() => navigate('/inspection/clients/editor')}
                      className="text-blue-600 hover:underline"
                    >
                      Add one now
                    </button>
                  </p>
                )}
              </div>

              {/* License Number Selection */}
              {request.clientId && request.supplierId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number <span className="text-red-500">*</span>
                  </label>
                  
                  {!showNewLicenseInput ? (
                    <>
                      <select
                        value={request.licenseNumber}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            setShowNewLicenseInput(true)
                          } else {
                            handleInputChange('licenseNumber', e.target.value)
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">Select a license</option>
                        {availableLicenses.map(license => (
                          <option key={license.id} value={license.licenseNumber}>
                            {license.licenseNumber}
                          </option>
                        ))}
                        <option value="__new__" className="font-medium text-blue-600">
                          + Add New License
                        </option>
                      </select>
                      {availableLicenses.length === 0 && (
                        <p className="mt-1 text-sm text-gray-500">
                          No licenses available for this client-supplier combination.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newLicenseValue}
                          onChange={(e) => setNewLicenseValue(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddNewLicense()
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                          placeholder="Enter new license number"
                          autoFocus
                        />
                        <button
                          onClick={handleAddNewLicense}
                          className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-medium transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setShowNewLicenseInput(false)
                            setNewLicenseValue('')
                          }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Container Type
                </label>
                <input
                  type="text"
                  value={request.containerType}
                  onChange={(e) => handleInputChange('containerType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="40' dry high cube"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inspection Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={request.inspectionDate}
                    onChange={(e) => handleInputChange('inspectionDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inspection Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={request.inspectionTime}
                    onChange={(e) => handleInputChange('inspectionTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

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
                  {id ? 'Update Request' : 'Create Request'}
                </button>
              </div>
            </div>

            {/* Preview Section */}
            <div className="lg:border-l lg:pl-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Preview</h2>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                {selectedSupplier && (
                  <div className="mb-6 pb-4 border-b border-gray-300">
                    <div className="text-sm space-y-1">
                      <p className="font-semibold">{selectedSupplier.name}</p>
                      <p>{selectedSupplier.address}</p>
                      <p>{selectedSupplier.zipCode} {selectedSupplier.city}, {selectedSupplier.country}</p>
                      <p>{selectedSupplier.email}</p>
                      <p>{selectedSupplier.phone}</p>
                      {selectedSupplier.vatNumber && <p>P.IVA: {selectedSupplier.vatNumber}</p>}
                      {selectedSupplier.cf && <p>CF: {selectedSupplier.cf}</p>}
                    </div>
                  </div>
                )}
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {generatePreviewText()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InspectionRequestEditor

