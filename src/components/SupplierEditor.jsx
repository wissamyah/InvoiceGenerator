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
    cf: '',
    stamp: ''
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

  const handleStampUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'image/svg+xml' && !file.type.startsWith('image/')) {
      showAlert('Invalid File', 'Please upload an SVG or image file.', 'error')
      return
    }

    // Validate file size (max 2MB for images to allow high-quality uploads, 200KB for SVG)
    const maxSize = file.type.startsWith('image/png') || file.type.startsWith('image/jpeg') ? 2 * 1024 * 1024 : 200 * 1024
    if (file.size > maxSize) {
      const maxSizeMB = file.type.startsWith('image/') ? '2MB' : '200KB'
      showAlert('File Too Large', `Stamp file is too large. Maximum size: ${maxSizeMB}`, 'error')
      return
    }

    try {
      // If it's an SVG, convert to PNG for better PDF compatibility
      if (file.type === 'image/svg+xml') {
        const svgText = await file.text()
        
        // Convert SVG to PNG
        const pngDataUrl = await convertSvgToPng(svgText)
        
        if (pngDataUrl) {
          handleInputChange('stamp', pngDataUrl)
          showAlert('Success', 'Stamp uploaded and converted to PNG for PDF compatibility.', 'success')
        } else {
          // Fallback to storing SVG if conversion fails
          handleInputChange('stamp', svgText)
          showAlert('Warning', 'Stamp uploaded as SVG. May have compatibility issues in PDFs.', 'warning')
        }
      } else {
        // For PNG/JPG, optimize resolution for PDF rendering
        const reader = new FileReader()
        reader.onload = async (event) => {
          const img = new window.Image()
          img.onload = () => {
            // Target width for high-quality PDF rendering
            const TARGET_WIDTH = 450 // 3x scale of 150pt display size
            const aspectRatio = img.height / img.width
            
            // Only resize if significantly different from target
            if (Math.abs(img.width - TARGET_WIDTH) > 50) {
              const canvas = document.createElement('canvas')
              canvas.width = TARGET_WIDTH
              canvas.height = TARGET_WIDTH * aspectRatio
              
              const ctx = canvas.getContext('2d')
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              
              const optimizedDataUrl = canvas.toDataURL('image/png', 1.0)
              handleInputChange('stamp', optimizedDataUrl)
              showAlert('Success', 'Stamp uploaded and optimized for PDF.', 'success')
            } else {
              // Image is already at good resolution
              handleInputChange('stamp', event.target.result)
              showAlert('Success', 'Stamp uploaded successfully.', 'success')
            }
          }
          img.onerror = () => {
            showAlert('Error', 'Error processing image file.', 'error')
          }
          img.src = event.target.result
        }
        reader.onerror = () => {
          showAlert('Error', 'Error reading image file.', 'error')
        }
        reader.readAsDataURL(file)
      }
    } catch (error) {
      console.error('Error processing stamp file:', error)
      showAlert('Error', 'Error processing stamp file. Please try again.', 'error')
    }
  }

  // Helper function to convert SVG to PNG at high resolution
  const convertSvgToPng = (svgString) => {
    return new Promise((resolve) => {
      try {
        const img = new window.Image()
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)
        
        img.onload = () => {
          // High-quality conversion: 3x scale for crisp rendering in PDFs
          // PDF will display at ~150pt width, so we render at 450px for clarity
          const SCALE_FACTOR = 3
          const pdfDisplayWidth = 150
          const aspectRatio = img.height / img.width
          const canvasWidth = pdfDisplayWidth * SCALE_FACTOR
          const canvasHeight = canvasWidth * aspectRatio
          
          const canvas = document.createElement('canvas')
          canvas.width = canvasWidth
          canvas.height = canvasHeight
          
          const ctx = canvas.getContext('2d')
          // Transparent background for stamps
          ctx.clearRect(0, 0, canvasWidth, canvasHeight)
          // Use high-quality image rendering
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)
          
          // Convert to PNG with high quality
          const pngDataUrl = canvas.toDataURL('image/png', 1.0)
          URL.revokeObjectURL(url)
          
          resolve(pngDataUrl)
        }
        
        img.onerror = () => {
          console.error('Failed to load SVG for conversion')
          URL.revokeObjectURL(url)
          resolve(null)
        }
        
        img.src = url
      } catch (error) {
        console.error('Error converting SVG to PNG:', error)
        resolve(null)
      }
    })
  }

  const handleRemoveStamp = () => {
    handleInputChange('stamp', '')
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
        navigate('/management/suppliers')
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
    navigate('/management/suppliers')
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

            {/* Stamp/Logo Section */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Company Stamp/Logo</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Company Stamp (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Upload your company stamp or logo. Accepts SVG (best quality), PNG, or JPG. Images are automatically optimized for crisp PDF rendering. Max size: 2MB for PNG/JPG, 200KB for SVG.
                  </p>
                  
                  {supplier.stamp ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 border border-gray-300 bg-white rounded flex items-center justify-center p-2">
                            {supplier.stamp.startsWith('data:image/') ? (
                              <img 
                                src={supplier.stamp} 
                                alt="Company Stamp" 
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <div 
                                className="max-w-full max-h-full"
                                dangerouslySetInnerHTML={{ __html: supplier.stamp }}
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Stamp uploaded</p>
                            <p className="text-xs text-gray-500">This stamp will appear on PDFs</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveStamp}
                          className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      <label className="inline-block px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 font-medium text-sm transition-colors cursor-pointer">
                        Replace Stamp
                        <input
                          type="file"
                          accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
                          onChange={handleStampUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="inline-block px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium text-sm transition-colors cursor-pointer">
                      Upload Stamp
                      <input
                        type="file"
                        accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
                        onChange={handleStampUpload}
                        className="hidden"
                      />
                    </label>
                  )}
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

