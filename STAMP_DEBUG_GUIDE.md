# SVG Stamp Not Appearing in PDF - Debug Guide

## What I've Fixed

### 1. **Changed SVG Encoding Method**

- **Before**: Used `encodeURIComponent()` which creates URL-encoded strings
- **After**: Now using **base64 encoding** which is more compatible with `@react-pdf/renderer`
- **Location**: `PDFDocument.jsx` and `InspectionPDFDocument.jsx`

```javascript
// Old method (URL encoding)
const encoded = encodeURIComponent(supplier.stamp);
return `data:image/svg+xml,${encoded}`;

// New method (Base64 encoding) ✓
const base64 = btoa(unescape(encodeURIComponent(supplier.stamp)));
return `data:image/svg+xml;base64,${base64}`;
```

### 2. **Added Comprehensive Debugging**

Added console logs at every step to trace the data flow:

- When PDF generation starts
- Whether supplier is found
- Whether stamp exists in supplier data
- Stamp data length and conversion success

## How to Debug

### Step 1: Open Browser Console

1. Open your app in the browser
2. Press `F12` or `Ctrl+Shift+I` to open Developer Tools
3. Go to the **Console** tab

### Step 2: Try to Download a PDF

1. Navigate to an invoice or inspection request that uses a supplier with a stamp
2. Click **"Download PDF"** button
3. Watch the console output

### Step 3: Analyze Console Output

**Expected Console Messages:**

```
InvoiceList: Generating PDF for invoice INV001
InvoiceList: Supplier ID: abc123xyz
InvoiceList: Supplier found: Yes
InvoiceList: Supplier has stamp: Yes
InvoiceList: Stamp length: 15234
PDFDocument: Converting stamp to base64, stamp length: 15234
PDFDocument: Stamp data URL created, length: 20456
PDFDocument: Supplier data: exists
PDFDocument: Stamp data URL: created
```

**If you see "No stamp found" or "Supplier has stamp: No":**

- The stamp data is not in the database
- Or the supplier is not being found correctly
- Check the supplier ID in the database

**If you see "Error converting stamp":**

- The SVG might be corrupted
- Try re-uploading the stamp

## Common Issues & Solutions

### Issue 1: Supplier Not Found

**Symptom**: Console shows "Supplier found: No"

**Solution**:

1. Check that the invoice/request has a valid `supplierId`
2. Verify the supplier exists in the database
3. Make sure the supplier wasn't deleted

### Issue 2: Stamp Field is Empty

**Symptom**: Console shows "Supplier has stamp: No"

**Solution**:

1. Go to Supplier Management
2. Open the supplier
3. Re-upload the SVG stamp
4. Make sure you click "Update Supplier" to save

### Issue 3: SVG Still Not Rendering (Even After Base64 Fix)

**Known Limitation**: `@react-pdf/renderer` has **limited SVG support**

**Why it happens**:

- Complex SVG paths may not render
- Some SVG features are not supported by the PDF library
- Gradients, filters, and advanced SVG features may fail

**Solution**: Convert SVG to PNG before uploading (see below)

## Advanced Solution: Convert SVG to PNG

If the SVG still doesn't appear after the base64 fix, you'll need to convert it to PNG format, which has **100% compatibility** with react-pdf.

### Option A: Convert SVG to PNG Before Upload

**Using Online Tools:**

1. Go to https://cloudconvert.com/svg-to-png
2. Upload your SVG stamp
3. Set size to 300x300 pixels (or desired size)
4. Download the PNG
5. Modify the upload handler to accept PNG files

**Code Changes Needed:**

```javascript
// In SupplierEditor.jsx, line 63
if (file.type !== "image/svg+xml" && file.type !== "image/png") {
  showAlert("Invalid File", "Please upload an SVG or PNG file.", "error");
  return;
}
```

### Option B: Implement Client-Side SVG to PNG Conversion

If you want to keep using SVG uploads but convert them automatically, you'll need to add a conversion utility. This is more complex but provides the best user experience.

## Verification Steps

After applying the fixes:

1. **Check Console Logs**: Make sure all debug messages show successful stamp loading
2. **Download PDF**: Generate a PDF and open it
3. **Look for Stamp**: The stamp should appear in the top-right corner of invoices or inspection requests
4. **Check Size**: The stamp is set to 70x70 pixels - make sure it's visible

## If Nothing Works

If the stamp still doesn't appear after trying everything:

### Last Resort Solution: PNG Upload Only

Modify the app to only accept PNG files for stamps:

1. **Update SupplierEditor.jsx**:

```javascript
// Change line 63 from:
if (file.type !== 'image/svg+xml') {

// To:
if (!file.type.startsWith('image/')) {
```

2. **Update file reading** (line 75):

```javascript
// For image files, convert to base64
const reader = new FileReader();
reader.onload = (e) => {
  handleInputChange("stamp", e.target.result); // This will be a data URL
};
reader.readAsDataURL(file);
```

3. **Update PDF components**: Remove the conversion logic since the stamp is already a data URL

## Technical Details

### Why SVG is Problematic with react-pdf

1. **Limited SVG Support**: The library doesn't support all SVG features
2. **Encoding Issues**: Different encoding methods work for different SVGs
3. **Size Constraints**: Large SVG files may fail to render

### Base64 vs URL Encoding

- **Base64**: Binary-safe encoding, better for PDF libraries
- **URL Encoding**: Good for URLs, but some characters cause issues in PDFs

### Current Implementation

```javascript
// src/components/PDFDocument.jsx lines 182-197
const getStampDataUrl = () => {
  if (!supplier?.stamp) {
    console.log("PDFDocument: No stamp found in supplier data");
    return null;
  }
  try {
    console.log("PDFDocument: Converting stamp to base64");
    const base64 = btoa(unescape(encodeURIComponent(supplier.stamp)));
    const dataUrl = `data:image/svg+xml;base64,${base64}`;
    console.log("PDFDocument: Stamp data URL created");
    return dataUrl;
  } catch (error) {
    console.error("PDFDocument: Error converting stamp:", error);
    return null;
  }
};
```

## Next Steps

1. **Run the app** and check console logs
2. **Report back** what the console shows
3. **If stamp still doesn't appear**, try converting SVG to PNG
4. **Share console output** so we can diagnose further

## Contact Points

Files modified:

- `src/components/PDFDocument.jsx`
- `src/components/InspectionPDFDocument.jsx`
- `src/components/InvoiceList.jsx`
- `src/components/InspectionRequestList.jsx`
- `src/components/InvoiceEditor.jsx`
- `src/components/InspectionRequestEditor.jsx`
