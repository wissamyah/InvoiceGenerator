import { useState, useEffect, createContext, useContext } from 'react'

// Auth context to share logout function
const AuthContext = createContext({
  logout: () => {}
})

export const useAuth = () => useContext(AuthContext)

// Hash function to avoid storing password in plain text
const hashPassword = async (password) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'invoice-generator-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const PasswordGate = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)

  useEffect(() => {
    // Check if already authenticated in this session
    const checkAuth = async () => {
      const storedHash = sessionStorage.getItem('auth_token')
      if (storedHash) {
        const validHash = await hashPassword('ADMIN')
        if (storedHash === validHash) {
          setIsAuthenticated(true)
        }
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsVerifying(true)

    try {
      const inputHash = await hashPassword(password.toUpperCase())
      const validHash = await hashPassword('ADMIN')

      if (inputHash === validHash) {
        sessionStorage.setItem('auth_token', validHash)
        setIsVerifying(false)
        setIsUnlocking(true)

        // Show unlocking animation for 1.5 seconds
        setTimeout(() => {
          setIsAuthenticated(true)
          setIsUnlocking(false)
        }, 1500)
      } else {
        setError('Incorrect password')
        setPassword('')
        setIsVerifying(false)
      }
    } catch {
      setError('An error occurred. Please try again.')
      setIsVerifying(false)
    }
  }

  const logout = () => {
    sessionStorage.removeItem('auth_token')
    setIsAuthenticated(false)
    setPassword('')
    setError('')
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-gray-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (isUnlocking) {
    return (
      <div className="min-h-[100dvh] bg-gray-100 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-gray-900 rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 font-medium animate-pulse">Accessing application...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <AuthContext.Provider value={{ logout }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Invoice Generator
            </h1>
            <p className="text-sm text-gray-500">
              Enter password to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow"
                placeholder="Enter password"
                autoFocus
                autoComplete="current-password"
                disabled={isVerifying}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center animate-shake">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isVerifying || !password}
              className="w-full py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unlock
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Protected access
        </p>
      </div>
    </div>
  )
}

export default PasswordGate
