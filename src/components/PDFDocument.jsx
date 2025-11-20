import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'

// A4 page size: 595.28 x 841.89 points
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
  },
  invoiceInfo: {
    fontSize: 9,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%',
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  text: {
    fontSize: 9,
    marginBottom: 3,
    color: '#333',
  },
  textBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#000',
    color: '#fff',
    padding: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    padding: 8,
  },
  tableCol1: {
    width: '40%',
  },
  tableCol2: {
    width: '15%',
    textAlign: 'right',
  },
  tableCol3: {
    width: '15%',
    textAlign: 'right',
  },
  tableCol4: {
    width: '15%',
    textAlign: 'right',
  },
  tableCol5: {
    width: '15%',
    textAlign: 'right',
  },
  totalsSection: {
    marginLeft: 'auto',
    width: '50%',
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    fontSize: 9,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderTopWidth: 2,
    borderTopColor: '#000',
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  shippingText: {
    fontSize: 8,
    color: '#666',
    marginTop: 3,
  },
  notes: {
    marginBottom: 20,
  },
  notesText: {
    fontSize: 9,
    color: '#333',
    lineHeight: 1.5,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 15,
    paddingBottom: 60,
  },
  stamp: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    width: 150,
  },
  pageWithStamp: {
    position: 'relative',
  },
})

const PDFDocument = ({ invoice, totals, supplier }) => {
  // Defensive checks for undefined values
  const safeInvoice = {
    ...invoice,
    documentType: invoice?.documentType || 'invoice',
    from: {
      ...(invoice?.from || {}),
      piva: invoice?.from?.piva || '',
      cf: invoice?.from?.cf || ''
    },
    to: invoice?.to || {},
    lineItems: invoice?.lineItems || [],
    bankDetails: invoice?.bankDetails || {},
    currency: invoice?.currency || 'EUR',
    shippingType: invoice?.shippingType || 'C&F',
    vatEnabled: invoice?.vatEnabled || false,
    vatRate: invoice?.vatRate || 0,
  }

  const documentTitle = safeInvoice.documentType === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE'
  const documentLabel = safeInvoice.documentType === 'proforma' ? 'PROFORMA INVOICE DETAILS' : 'INVOICE DETAILS'

  const safeTotals = {
    subtotal: totals?.subtotal || 0,
    vatAmount: totals?.vatAmount || 0,
    total: totals?.total || 0,
  }

  const formatCurrency = (amount) => {
    const symbol = safeInvoice.currency === 'EUR' ? '€' : '$'
    const numAmount = parseFloat(amount) || 0
    return `${symbol}${numAmount.toFixed(2)}`
  }

  // Format date to EU format (DD/MM/YYYY)
  const formatDateEU = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return format(date, 'dd/MM/yyyy')
    } catch {
      return dateString
    }
  }

  // Check if stamp is valid (should be a data URL)
  const stampDataUrl = supplier?.stamp && 
    (supplier.stamp.startsWith('data:image/png') || 
     supplier.stamp.startsWith('data:image/jpeg') ||
     supplier.stamp.startsWith('data:image/jpg'))
    ? supplier.stamp
    : null
  
  // Stamp processing removed for cleaner console

  return (
    <Document>
      <Page size="A4" style={[styles.page, styles.pageWithStamp]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
            <Text style={styles.title}>{documentTitle}</Text>
            <View style={{ textAlign: 'right', position: 'relative' }}>
              <Text style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>{documentLabel}</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                #{safeInvoice.invoiceNumber || 'N/A'}
              </Text>
              <Text style={styles.invoiceInfo}>{formatDateEU(safeInvoice.date)}</Text>
            </View>
          </View>
        </View>

        {/* From/To Section */}
        <View style={[styles.section, styles.row]}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>From:</Text>
            <Text style={styles.textBold}>{safeInvoice.from.name || 'Your Company Name'}</Text>
            <Text style={styles.text}>{safeInvoice.from.address || 'Your Address'}</Text>
            <Text style={styles.text}>{safeInvoice.from.email || 'your@email.com'}</Text>
            <Text style={styles.text}>{safeInvoice.from.phone || 'Your Phone'}</Text>
            <Text style={styles.text}>{safeInvoice.from.country || 'Your Country'}</Text>
            {safeInvoice.from.piva && (
              <Text style={[styles.text, { marginTop: 3 }]}>P.IVA: {safeInvoice.from.piva}</Text>
            )}
            {safeInvoice.from.cf && (
              <Text style={styles.text}>CF: {safeInvoice.from.cf}</Text>
            )}
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>To:</Text>
            <Text style={styles.textBold}>{safeInvoice.to.name || 'Client Name'}</Text>
            <Text style={styles.text}>{safeInvoice.to.address || 'Client Address'}</Text>
            <Text style={styles.text}>{safeInvoice.to.email || 'client@email.com'}</Text>
            <Text style={styles.text}>{safeInvoice.to.phone || 'Client Phone'}</Text>
            <Text style={styles.text}>{safeInvoice.to.country || 'Client Country'}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCol1}>Description</Text>
            <Text style={styles.tableCol2}>Qty</Text>
            <Text style={styles.tableCol3}>Unit</Text>
            <Text style={styles.tableCol4}>Rate</Text>
            <Text style={styles.tableCol5}>Amount</Text>
          </View>
          {safeInvoice.lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCol1}>{item?.description || '-'}</Text>
              <Text style={styles.tableCol2}>{item?.quantity || 0}</Text>
              <Text style={styles.tableCol3}>{item?.unit === 'None' ? '' : (item?.unit || '')}</Text>
              <Text style={styles.tableCol4}>{formatCurrency(item?.rate || 0)}</Text>
              <Text style={styles.tableCol5}>{formatCurrency(item?.amount || 0)}</Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={{ color: '#666' }}>Subtotal:</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>
              {formatCurrency(safeTotals.subtotal)}
            </Text>
          </View>
          {safeInvoice.vatEnabled && (
            <View style={styles.totalRow}>
              <Text style={{ color: '#666' }}>VAT ({safeInvoice.vatRate}%):</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                {formatCurrency(safeTotals.vatAmount)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text>Total {safeInvoice.shippingType}:</Text>
            <Text>{formatCurrency(safeTotals.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {safeInvoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.sectionTitle}>Notes:</Text>
            <Text style={styles.notesText}>{safeInvoice.notes}</Text>
          </View>
        )}

        {/* Bank Details */}
        <View style={styles.footer}>
          <Text style={styles.sectionTitle}>Bank Details:</Text>
          {safeInvoice.bankDetails.bankName && (
            <Text style={styles.text}>Bank: {safeInvoice.bankDetails.bankName}</Text>
          )}
          <Text style={styles.text}>
            Account Name: {safeInvoice.bankDetails.accountName || 'N/A'}
          </Text>
          <Text style={styles.text}>IBAN: {safeInvoice.bankDetails.iban || 'N/A'}</Text>
          <Text style={styles.text}>BIC: {safeInvoice.bankDetails.bic || 'N/A'}</Text>
        </View>

        {/* Stamp at bottom right */}
        {stampDataUrl && (
          <View style={styles.stamp}>
            <Image 
              src={stampDataUrl} 
              style={{ width: '100%', height: 'auto' }}
              cache={false}
            />
          </View>
        )}
      </Page>
    </Document>
  )
}

export default PDFDocument

