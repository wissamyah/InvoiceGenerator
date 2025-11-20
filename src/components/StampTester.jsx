import { useState, useEffect } from 'react'
import db from '../lib/instantdb'
import { svgToBase64DataUrl, svgToPngDataUrl, isValidSvg, hasComplexSvgFeatures } from '../utils/stampConverter'

/**
 * Stamp Tester Component
 * 
 * This component helps debug and test stamp rendering issues.
 * Use this to:
 * 1. See which suppliers have stamps
 * 2. Validate SVG stamps
 * 3. Preview stamps as they would appear in PDFs
 * 4. Convert problematic SVGs to PNG
 * 
 * To use: Import and add this component temporarily to your app
 */
const StampTester = () => {
  const { data } = db.useQuery({ suppliers: {} })
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [base64Preview, setBase64Preview] = useState(null)
  const [pngPreview, setPngPreview] = useState(null)
  const [svgInfo, setSvgInfo] = useState(null)

  const suppliers = data?.suppliers || []

  useEffect(() => {
    if (selectedSupplier?.stamp) {
      // Test base64 conversion
      const base64Result = svgToBase64DataUrl(selectedSupplier.stamp)
      setBase64Preview(base64Result)

      // Test PNG conversion
      svgToPngDataUrl(selectedSupplier.stamp, 300, 300).then(pngResult => {
        setPngPreview(pngResult)
      })

      // Analyze SVG
      setSvgInfo({
        isValid: isValidSvg(selectedSupplier.stamp),
        hasComplexFeatures: hasComplexSvgFeatures(selectedSupplier.stamp),
        length: selectedSupplier.stamp.length,
        startsWithXml: selectedSupplier.stamp.trim().startsWith('<?xml'),
        hasSvgTag: selectedSupplier.stamp.includes('<svg')
      })
    } else {
      setBase64Preview(null)
      setPngPreview(null)
      setSvgInfo(null)
    }
  }, [selectedSupplier])

  const updateSupplierStamp = async (newStamp) => {
    if (!selectedSupplier) return
    
    try {
      await db.transact([
        db.tx.suppliers[selectedSupplier.id].update({ stamp: newStamp })
      ])
      alert('Stamp updated successfully! Refresh to see changes.')
    } catch (error) {
      console.error('Error updating stamp:', error)
      alert('Error updating stamp')
    }
  }

  const convertToPng = async () => {
    if (!selectedSupplier?.stamp || !pngPreview) return
    
    const confirmed = window.confirm(
      'This will replace the SVG stamp with a PNG version. This usually fixes rendering issues but increases file size. Continue?'
    )
    
    if (confirmed) {
      await updateSupplierStamp(pngPreview)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Stamp Tester & Debugger</h1>
        
        {/* Supplier Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Supplier
          </label>
          <select
            value={selectedSupplier?.id || ''}
            onChange={(e) => {
              const supplier = suppliers.find(s => s.id === e.target.value)
              setSelectedSupplier(supplier)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">-- Select a supplier --</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name} {supplier.stamp ? '✓ Has stamp' : '✗ No stamp'}
              </option>
            ))}
          </select>
        </div>

        {selectedSupplier && (
          <>
            {/* Supplier Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h2 className="font-semibold text-gray-900 mb-2">Supplier: {selectedSupplier.name}</h2>
              <p className="text-sm text-gray-600">ID: {selectedSupplier.id}</p>
              <p className="text-sm text-gray-600">Has Stamp: {selectedSupplier.stamp ? 'Yes' : 'No'}</p>
            </div>

            {selectedSupplier.stamp ? (
              <>
                {/* SVG Analysis */}
                {svgInfo && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-md">
                    <h3 className="font-semibold text-gray-900 mb-3">SVG Analysis</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Valid SVG:</span>
                        <span className={`ml-2 font-medium ${svgInfo.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {svgInfo.isValid ? '✓ Yes' : '✗ No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Has Complex Features:</span>
                        <span className={`ml-2 font-medium ${svgInfo.hasComplexFeatures ? 'text-orange-600' : 'text-green-600'}`}>
                          {svgInfo.hasComplexFeatures ? '⚠ Yes (may cause issues)' : '✓ No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">File Size:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {(svgInfo.length / 1024).toFixed(2)} KB
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Has XML Declaration:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {svgInfo.startsWithXml ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Original SVG */}
                  <div className="border border-gray-200 rounded-md p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Original SVG (Browser)</h3>
                    <div 
                      className="w-full h-48 border border-gray-300 bg-gray-50 rounded flex items-center justify-center p-4"
                      dangerouslySetInnerHTML={{ __html: selectedSupplier.stamp }}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      How browser renders the SVG
                    </p>
                  </div>

                  {/* Base64 SVG Preview */}
                  <div className="border border-gray-200 rounded-md p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Base64 SVG (PDF Method)</h3>
                    {base64Preview ? (
                      <>
                        <div className="w-full h-48 border border-gray-300 bg-gray-50 rounded flex items-center justify-center p-4">
                          <img 
                            src={base64Preview} 
                            alt="Base64 SVG Preview"
                            className="max-w-full max-h-full"
                            onError={() => console.error('Base64 SVG failed to load')}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Current PDF method (base64)
                        </p>
                      </>
                    ) : (
                      <div className="w-full h-48 border border-gray-300 bg-red-50 rounded flex items-center justify-center">
                        <p className="text-red-600 text-sm">Failed to convert</p>
                      </div>
                    )}
                  </div>

                  {/* PNG Preview */}
                  <div className="border border-gray-200 rounded-md p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">PNG Conversion (Fallback)</h3>
                    {pngPreview ? (
                      <>
                        <div className="w-full h-48 border border-gray-300 bg-gray-50 rounded flex items-center justify-center p-4">
                          <img 
                            src={pngPreview} 
                            alt="PNG Preview"
                            className="max-w-full max-h-full"
                            onError={() => console.error('PNG conversion failed to load')}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          100% compatible with PDFs
                        </p>
                      </>
                    ) : (
                      <div className="w-full h-48 border border-gray-300 bg-gray-100 rounded flex items-center justify-center">
                        <p className="text-gray-500 text-sm">Converting...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Stamp not showing in PDF?
                    </p>
                    <p className="text-xs text-blue-700">
                      If the base64 preview above doesn't show correctly, click "Convert to PNG" to fix the issue.
                    </p>
                  </div>
                  <button
                    onClick={convertToPng}
                    disabled={!pngPreview}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Convert to PNG
                  </button>
                </div>

                {/* Debug Info */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    Show Raw SVG Data
                  </summary>
                  <pre className="text-xs bg-gray-50 p-4 rounded-md overflow-x-auto border border-gray-200">
                    {selectedSupplier.stamp}
                  </pre>
                </details>
              </>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-md">
                <p className="text-gray-600">This supplier has no stamp uploaded.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Go to Supplier Management to upload a stamp.
                </p>
              </div>
            )}
          </>
        )}

        {!selectedSupplier && (
          <div className="p-8 text-center bg-gray-50 rounded-md">
            <p className="text-gray-600">Select a supplier to test their stamp</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StampTester

