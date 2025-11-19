import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import db, { id as generateId } from '../lib/instantdb'
import { useUnsavedChanges } from '../App'
import { useModal } from '../contexts/ModalContext'

const SupplierEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data } = db.useQuery({ suppliers: {} })
  const initialSupplierRef = useRef(null)
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges()
  const { showAlert, showConfirm } = useModal()
  const [isLoaded, setIsLoaded] = useState(false)

  const [supplier, setSupplier] = useState({
    name: '',
    address: '',
    city: '',
    zipCode: '',
    country: '',
    email: '',
    phone: '',
    vatNumber: '',
    cf: ''
  })

  useEffect(() => {
    if (id && data?.suppliers) {
      const existingSupplier = data.suppliers.find(s => s.id === id)
      if (existingSupplier) {
        setSupplier(existingSupplier)
        initialSupplierRef.current = JSON.stringify(existingSupplier)
        setIsLoaded(true)
      }
    } else {
      initialSupplierRef.current = JSON.stringify(supplier)
      setIsLoaded(true)
    }
  }, [id, data])

  useEffect(() => {
    if (isLoaded) {
      const currentSupplier = JSON.stringify(supplier)
      const hasChanges = currentSupplier !== initialSupplierRef.current
      setHasUnsavedChanges(hasChanges)
    }
  }, [supplier, isLoaded, setHasUnsavedChanges])

  const handleInputChange = (field, value) => {
    setSupplier(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    // Validation
    if (!supplier.name?.trim()) {
      showAlert('Validation Error', 'Supplier name is required.', 'error')
      return
    }
    if (!supplier.email?.trim()) {
      showAlert('Validation Error', 'Email is required.', 'error')
      return
    }

    try {
      if (id) {
        // Update existing supplier
        await db.transact([
          db.tx.suppliers[id].update(supplier)
        ])
        showAlert('Success', 'Supplier updated successfully.', 'success')
      } else {
        // Create new supplier
        const newId = generateId()
        await db.transact([
          db.tx.suppliers[newId].update(supplier)
        ])
        showAlert('Success', 'Supplier created successfully.', 'success')
      }
      
      initialSupplierRef.current = JSON.stringify(supplier)
      setHasUnsavedChanges(false)
      
      setTimeout(() => {
        navigate('/inspection/suppliers')
      }, 500)
    } catch (error) {
      console.error('Error saving supplier:', error)
      showAlert('Error', 'Error saving supplier. Please try again.', 'error')
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
    navigate('/inspection/suppliers')
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6">
            {id ? 'Edit Supplier' : 'New Supplier'}
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
                  value={supplier.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={supplier.email}
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
                  value={supplier.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="+39 123 456 7890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VAT Number
                </label>
                <input
                  type="text"
                  value={supplier.vatNumber}
                  onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="IT12345678901"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codice Fiscale (CF)
                </label>
                <input
                  type="text"
                  value={supplier.cf}
                  onChange={(e) => handleInputChange('cf', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="CF12345678901"
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
                    value={supplier.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Via Example 123"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={supplier.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Milan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={supplier.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="20100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={supplier.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Italy"
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
                {id ? 'Update Supplier' : 'Create Supplier'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupplierEditor

