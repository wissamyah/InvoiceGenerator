import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="min-h-[calc(100vh-57px)] bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Business Document Manager
        </h1>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Invoice Generator Card */}
          <Link
            to="/invoices/editor"
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-8 flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invoice Generator
            </h2>
            <p className="text-gray-600">
              Create and manage invoices and proforma invoices
            </p>
          </Link>

          {/* Inspection Requests Card */}
          <Link
            to="/inspection/requests"
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-8 flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Inspection Requests
            </h2>
            <p className="text-gray-600">
              Create and manage Bureau Veritas inspection requests
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home

