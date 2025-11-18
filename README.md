# Modern Invoice Generator

A professional invoice generator with real-time editing, live preview, and client-side PDF generation.

## Tech Stack

- **Framework**: React + Vite
- **Styling**: TailwindCSS
- **Backend**: Instant DB (Real-time database)
- **PDF Generation**: @react-pdf/renderer (Client-side, A4 format)
- **Routing**: React Router DOM

## Features

- Real-time inline editing with live preview
- Split-view interface: preview (left) + editing form (right)
- Automatic calculations for line items and totals
- Currency support: EUR (€) and USD ($)
- Shipping type selector: C&F or CIF
- Optional VAT calculation with custom rate
- Manual invoice number entry
- Bank details per invoice
- Client-side PDF generation (A4 format)
- Real-time data persistence with Instant DB
- No authentication required

## Getting Started

### Prerequisites

1. Node.js 16+ installed
2. An InstantDB account and app ID ([Get it here](https://instantdb.com/dash))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/wissamyah/InvoiceGenerator.git
cd InvoiceGenerator
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Add your InstantDB App ID to the `.env` file:
```
VITE_INSTANTDB_APP_ID=your-instantdb-app-id-here
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Build

```bash
npm run build
```

## Usage

### Creating an Invoice

1. The app starts on the Editor view by default
2. Fill in the invoice details in the right panel:
   - Invoice number (manual entry)
   - Date
   - From/To information
   - Line items with quantity, unit, rate
   - Currency (EUR/USD toggle)
   - Shipping type (C&F/CIF toggle)
   - VAT settings (optional)
   - Notes
   - Bank details
3. See the live preview on the left as you type
4. Click "Save Invoice" to persist to database
5. Click "Download PDF" to generate and download PDF

### Editing an Invoice

1. Navigate to "Invoices" tab
2. Click on any invoice row to open it in the editor
3. Make changes and click "Save Invoice"

### Deleting an Invoice

1. Go to "Invoices" tab
2. Click "Delete" button on the invoice row
3. Confirm deletion

## Project Structure

```
/src
  /components
    InvoiceEditor.jsx    - Main editing interface with split view
    InvoiceList.jsx      - Table view of all invoices
    PDFDocument.jsx      - PDF template component
  /lib
    instantdb.js         - Instant DB initialization
  App.jsx               - Main app with routing and navigation
  main.jsx              - App entry point
  index.css             - Global styles with Tailwind
```

## Invoice Data Schema

```javascript
{
  invoiceNumber: string,
  date: string (YYYY-MM-DD),
  currency: "EUR" | "USD",
  shippingType: "C&F" | "CIF",
  vatEnabled: boolean,
  vatRate: number,
  notes: string,
  from: {
    name: string,
    address: string,
    email: string,
    phone: string,
    country: string
  },
  to: {
    name: string,
    address: string,
    email: string,
    phone: string,
    country: string
  },
  lineItems: [{
    description: string,
    quantity: number,
    unit: "None" | "KG",
    rate: number,
    amount: number (auto-calculated)
  }],
  bankDetails: {
    iban: string,
    bic: string,
    accountName: string
  }
}
```

## License

MIT

