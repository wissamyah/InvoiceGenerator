import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import db, { id as generateId } from '../lib/instantdb'
import { useUnsavedChanges } from '../App'
import { useModal } from '../contexts/ModalContext'

const ClientEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data } = db.useQuery({ clients: {} })
  const initialClientRef = useRef(null)
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges()
  const { showAlert, showConfirm } = useModal()
  const [isLoaded, setIsLoaded] = useState(false)

  const [client, setClient] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    email: '',
    phone: '',
    licenseNumber: ''
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
        navigate('/inspection/clients')
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
    navigate('/inspection/clients')
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  value={client.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="COD 2021_901899_002"
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

