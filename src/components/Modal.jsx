import { useEffect, useState } from 'react'

const Modal = ({ isOpen, onClose, onConfirm, title, message, type = 'confirm' }) => {
  const [password, setPassword] = useState('')

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) setPassword('')
  }, [isOpen])

  if (!isOpen) return null

  const isConfirm = type === 'confirm'
  const isAlert = type === 'alert'
  const isSuccess = type === 'success'
  const isError = type === 'error'
  const isPassword = type === 'password'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full animate-slideUp">
        {/* Header */}
        <div className="px-4 md:px-6 pt-5 md:pt-6 pb-3 md:pb-4">
          <div className="flex items-start gap-2.5 md:gap-3">
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              isSuccess ? 'bg-green-100' :
              isError ? 'bg-red-100' :
              isConfirm || isPassword ? 'bg-amber-100' :
              'bg-gray-100'
            }`}>
              {isSuccess && (
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isError && (
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {(isConfirm || isPassword) && (
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {isAlert && (
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            
            {/* Title and Message */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                {title}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Password Input */}
        {isPassword && (
          <div className="px-4 md:px-6 pb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="px-4 md:px-6 pb-5 md:pb-6 pt-2 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          {isConfirm || isPassword ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => isPassword ? onConfirm(password) : onConfirm()}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
              >
                Confirm
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Modal

