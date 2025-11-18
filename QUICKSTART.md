# Quick Start Guide

## Installation Complete!

All dependencies have been installed and the project is ready to use.

## Running the Application

The development server is already running in the background. Open your browser to:

```
http://localhost:5173
```

If you need to restart it, run:

```bash
npm run dev
```

## First Steps

1. **App starts on Editor view** - You'll see the invoice editor with a split-view layout
2. **Fill in your invoice details** on the right panel
3. **Watch the live preview** update on the left as you type
4. **Add line items** using the "Add Item" button
5. **Toggle currency** between EUR (€) and USD ($)
6. **Enable VAT** if needed and set your rate
7. **Save invoice** to persist it to Instant DB
8. **Download PDF** to export as a professional A4 PDF

## Navigation

- **Editor tab** - Create new or edit existing invoices
- **Invoices tab** - View all invoices, click to edit, or delete

## Key Features Implemented

✅ Split-view interface with live preview  
✅ Real-time inline editing  
✅ Automatic calculations (line items, subtotal, VAT, total)  
✅ Currency support (EUR/USD)  
✅ Shipping type selector (C&F/CIF)  
✅ Optional VAT calculation  
✅ Manual invoice numbering  
✅ Bank details per invoice  
✅ Client-side PDF generation (A4 format)  
✅ Real-time database with Instant DB  
✅ Edit existing invoices anytime  
✅ Delete invoices with confirmation  
✅ No authentication required

## Instant DB Configuration

The app is connected to Instant DB. The app ID is stored securely in the `.env` file.

All invoice data is automatically synced and persisted in real-time.

**Setup**: Make sure to create a `.env` file based on `.env.example` and add your InstantDB app ID.

## Troubleshooting

If you encounter any issues:

1. Make sure you're running Node.js 16+
2. Clear browser cache if the app doesn't load
3. Check browser console for any errors
4. Ensure Instant DB is accessible

## Next Steps

1. Open http://localhost:5173 in your browser
2. Start creating your first invoice!
3. Test all features: saving, editing, deleting, and PDF export

Enjoy your new invoice generator!
