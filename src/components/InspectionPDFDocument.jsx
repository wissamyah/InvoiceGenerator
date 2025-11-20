import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'

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
    maxWidth: 150,
    height: 'auto',
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

  // Handle stamp - convert SVG to PNG if needed
  const [stampDataUrl, setStampDataUrl] = useState(null)
  
  useEffect(() => {
    if (!supplier?.stamp) {
      console.log('InspectionPDFDocument: No stamp found')
      setStampDataUrl(null)
      return
    }
    
    // Check if it's already a PNG data URL
    if (supplier.stamp.startsWith('data:image/png') || supplier.stamp.startsWith('data:image/jpeg')) {
      console.log('InspectionPDFDocument: Using PNG/JPEG stamp directly')
      setStampDataUrl(supplier.stamp)
      return
    }
    
    // If it's SVG (legacy format), convert to PNG
    console.log('InspectionPDFDocument: Converting legacy SVG stamp to PNG...')
    const img = new window.Image()
    const svgBlob = new Blob([supplier.stamp], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    
    img.onload = () => {
      // Preserve aspect ratio - scale to fit nicely in PDF
      const maxWidth = 150
      const aspectRatio = img.height / img.width
      const width = maxWidth
      const height = maxWidth * aspectRatio
      
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'transparent'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      const pngDataUrl = canvas.toDataURL('image/png')
      console.log('InspectionPDFDocument: SVG converted to PNG successfully, size:', width, 'x', height)
      setStampDataUrl(pngDataUrl)
      URL.revokeObjectURL(url)
    }
    
    img.onerror = () => {
      console.error('InspectionPDFDocument: Failed to convert SVG stamp')
      URL.revokeObjectURL(url)
      setStampDataUrl(null)
    }
    
    img.src = url
  }, [supplier?.stamp])

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
          <Image src={stampDataUrl} style={styles.stamp} />
        )}
      </Page>
    </Document>
  )
}

export default InspectionPDFDocument

