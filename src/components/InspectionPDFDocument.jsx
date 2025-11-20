import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  supplierName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  supplierDetails: {
    fontSize: 9,
    color: '#333',
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
    textAlign: 'center',
    textDecoration: 'underline',
  },
  body: {
    marginBottom: 30,
    lineHeight: 1.6,
  },
  paragraph: {
    fontSize: 11,
    marginBottom: 15,
    lineHeight: 1.6,
  },
  attachmentsSection: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  attachmentTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
  },
  attachmentItem: {
    fontSize: 10,
    marginBottom: 3,
    marginLeft: 10,
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

const InspectionPDFDocument = ({ request, supplier, client }) => {
  if (!request || !supplier || !client) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Missing required data</Text>
        </Page>
      </Document>
    )
  }

  // Format date in Italian
  const dateObj = new Date(request.inspectionDate + 'T' + request.inspectionTime)
  const dayName = format(dateObj, 'EEEE')
  const dayNumber = format(dateObj, 'dd')
  const monthName = format(dateObj, 'MMMM')
  const year = format(dateObj, 'yyyy')

  // Italian day names mapping
  const italianDays = {
    'Monday': 'lunedì',
    'Tuesday': 'martedì',
    'Wednesday': 'mercoledì',
    'Thursday': 'giovedì',
    'Friday': 'venerdì',
    'Saturday': 'sabato',
    'Sunday': 'domenica'
  }

  // Italian month names mapping
  const italianMonths = {
    'January': 'gennaio',
    'February': 'febbraio',
    'March': 'marzo',
    'April': 'aprile',
    'May': 'maggio',
    'June': 'giugno',
    'July': 'luglio',
    'August': 'agosto',
    'September': 'settembre',
    'October': 'ottobre',
    'November': 'novembre',
    'December': 'dicembre'
  }

  const italianDay = italianDays[dayName] || dayName.toLowerCase()
  const italianMonth = italianMonths[monthName] || monthName.toLowerCase()

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
        {/* Supplier Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.supplierName}>{supplier.name || ''}</Text>
              <Text style={styles.supplierDetails}>{supplier.address || ''}</Text>
              <Text style={styles.supplierDetails}>
                {supplier.zipCode} {supplier.city}, {supplier.country}
              </Text>
              <Text style={styles.supplierDetails}>{supplier.email || ''}</Text>
              <Text style={styles.supplierDetails}>{supplier.phone || ''}</Text>
              {supplier.vatNumber && (
                <Text style={styles.supplierDetails}>P.IVA: {supplier.vatNumber}</Text>
              )}
              {supplier.cf && (
                <Text style={styles.supplierDetails}>CF: {supplier.cf}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>RICHIESTA ISPEZIONE</Text>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.paragraph}>
            Richiedo ispezione per un container {request.containerType} destinato alla ditta{' '}
            {client.name} - {client.city || 'Matadi'} - {client.country || 'Democratic Republic of Congo'}, 
            con numero di licenza {request.licenseNumber || 'N/A'}.
          </Text>

          <Text style={styles.paragraph}>
            Il container si carica presso {supplier.name} in {supplier.address} - {supplier.zipCode || ''} {supplier.city || ''} ({supplier.country || ''}) - il {italianDay} {dayNumber} di {italianMonth} {year} alle {request.inspectionTime}.
          </Text>
        </View>

        {/* Attachments */}
        <View style={styles.attachmentsSection}>
          <Text style={styles.attachmentTitle}>Allegato:</Text>
          <Text style={styles.attachmentItem}>Fattura Proforma</Text>
          <Text style={styles.attachmentItem}>
            Licenza {request.licenseNumber || 'N/A'}
          </Text>
          <Text style={styles.attachmentItem}>Request for information</Text>
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

export default InspectionPDFDocument

