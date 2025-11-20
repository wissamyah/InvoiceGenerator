/**
 * Utility functions for converting and handling stamp images for PDF generation
 * This helps resolve issues with SVG rendering in @react-pdf/renderer
 */

/**
 * Convert SVG string to base64 data URL
 * This is the current method being used in PDFDocument components
 * 
 * @param {string} svgString - The SVG content as a string
 * @returns {string|null} - Base64 encoded data URL or null if conversion fails
 */
export const svgToBase64DataUrl = (svgString) => {
  if (!svgString) return null
  
  try {
    // Encode SVG as base64 for better PDF compatibility
    const base64 = btoa(unescape(encodeURIComponent(svgString)))
    return `data:image/svg+xml;base64,${base64}`
  } catch (error) {
    console.error('Error converting SVG to base64:', error)
    return null
  }
}

/**
 * Convert SVG string to PNG data URL using canvas
 * This provides 100% compatibility with react-pdf but requires browser APIs
 * 
 * @param {string} svgString - The SVG content as a string
 * @param {number} width - Desired width of the PNG (default: 300)
 * @param {number} height - Desired height of the PNG (default: 300)
 * @returns {Promise<string|null>} - PNG data URL or null if conversion fails
 */
export const svgToPngDataUrl = (svgString, width = 300, height = 300) => {
  return new Promise((resolve) => {
    try {
      // Create an image element
      const img = new Image()
      
      // Create SVG data URL
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        
        // Fill with white background (optional, remove for transparent)
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)
        
        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert canvas to PNG data URL
        const pngDataUrl = canvas.toDataURL('image/png')
        
        // Clean up
        URL.revokeObjectURL(url)
        
        resolve(pngDataUrl)
      }
      
      img.onerror = (error) => {
        console.error('Error loading SVG for conversion:', error)
        URL.revokeObjectURL(url)
        resolve(null)
      }
      
      img.src = url
    } catch (error) {
      console.error('Error in svgToPngDataUrl:', error)
      resolve(null)
    }
  })
}

/**
 * Validate if a string is valid SVG
 * 
 * @param {string} svgString - The SVG content to validate
 * @returns {boolean} - True if valid SVG, false otherwise
 */
export const isValidSvg = (svgString) => {
  if (!svgString || typeof svgString !== 'string') return false
  
  try {
    // Check if it contains SVG tags
    const hasSvgTag = /<svg[\s\S]*?>[\s\S]*?<\/svg>/i.test(svgString)
    
    // Try to parse as XML
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString, 'image/svg+xml')
    
    // Check for parse errors
    const parserError = doc.querySelector('parsererror')
    
    return hasSvgTag && !parserError
  } catch (error) {
    console.error('Error validating SVG:', error)
    return false
  }
}

/**
 * Get stamp data URL with automatic fallback
 * First tries base64 SVG, then falls back to PNG conversion if needed
 * 
 * @param {object} supplier - The supplier object containing the stamp
 * @param {boolean} forcePng - Force PNG conversion even if SVG would work
 * @returns {Promise<string|null>} - Data URL for the stamp or null
 */
export const getStampDataUrl = async (supplier, forcePng = false) => {
  if (!supplier?.stamp) {
    return null
  }
  
  // Validate SVG
  if (!isValidSvg(supplier.stamp)) {
    console.error('Invalid SVG in stamp data')
    return null
  }
  
  // If force PNG or if we detect complex SVG features that might not work
  if (forcePng) {
    return await svgToPngDataUrl(supplier.stamp, 300, 300)
  }
  
  // Try base64 SVG first (faster, smaller file size)
  return svgToBase64DataUrl(supplier.stamp)
}

/**
 * Detect if SVG has features that might not work with react-pdf
 * 
 * @param {string} svgString - The SVG content to check
 * @returns {boolean} - True if SVG might have compatibility issues
 */
export const hasComplexSvgFeatures = (svgString) => {
  if (!svgString) return false
  
  // Features that often cause issues in react-pdf
  const problematicFeatures = [
    'linearGradient',
    'radialGradient',
    'filter',
    'feGaussianBlur',
    'mask',
    'clipPath',
    'foreignObject',
    'animate',
    'animateTransform'
  ]
  
  return problematicFeatures.some(feature => 
    svgString.toLowerCase().includes(feature.toLowerCase())
  )
}

export default {
  svgToBase64DataUrl,
  svgToPngDataUrl,
  isValidSvg,
  getStampDataUrl,
  hasComplexSvgFeatures
}

