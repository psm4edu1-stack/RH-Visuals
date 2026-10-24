import PDFDocument from 'pdfkit'

const COLORS = {
  ink: '#15131B',
  muted: '#69636F',
  line: '#DDD8D0',
  accent: '#C6432C',
  gold: '#B07B16',
  paper: '#FFFDF8',
  soft: '#F5F0E8',
}

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 48,
}

function inr(paise) {
  const value = Number(paise || 0) / 100
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `INR ${formatted}`
}

function cleanPdfText(value, maxLength = 1000) {
  return String(value ?? '')
    .replace(/[₹]/g, 'INR ')
    .replace(/[–—]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
    .trim()
    .slice(0, maxLength)
}

function optional(value) {
  const cleaned = cleanPdfText(value)
  return cleaned || null
}

export function renderQuotationPdf({ quotation, client, settings }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE.margin,
      bufferPages: true,
      info: {
        Title: `Quotation ${quotation.number}`,
        Author: settings.studioName || 'RH VISUALS',
        Subject: `Quotation for ${quotation.projectTitle}`,
        CreationDate: new Date(),
      },
    })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.rect(0, 0, PAGE.width, 12).fill(COLORS.accent)
    doc.rect(0, 12, PAGE.width, 3).fill(COLORS.gold)

    const contentWidth = PAGE.width - PAGE.margin * 2
    doc
      .fillColor(COLORS.ink)
      .font('Helvetica-Bold')
      .fontSize(23)
      .text(cleanPdfText(settings.studioName || 'RH VISUALS'), PAGE.margin, 52)
    if (optional(settings.tagline)) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(cleanPdfText(settings.tagline), PAGE.margin, 82, { width: 280 })
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLORS.ink)
      .text('QUOTATION', PAGE.margin, 118)
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(cleanPdfText(quotation.number), PAGE.margin, 133)
      .text(`Status: ${cleanPdfText(quotation.status)}`, PAGE.margin, 147)
    if (quotation.issuedAt) {
      doc.text(`Issued: ${new Date(quotation.issuedAt).toLocaleDateString('en-IN')}`, PAGE.margin, 161)
    }
    if (quotation.validUntil) {
      doc.text(`Valid until: ${new Date(`${quotation.validUntil}T00:00:00`).toLocaleDateString('en-IN')}`, PAGE.margin, quotation.issuedAt ? 175 : 161)
    }

    const studioLines = [
      optional(settings.address),
      optional(settings.city),
      optional(settings.phone),
      optional(settings.email),
      optional(settings.gstin) ? `GSTIN: ${cleanPdfText(settings.gstin)}` : null,
    ].filter(Boolean)
    let studioY = 118
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.ink).text('FROM', PAGE.width - PAGE.margin - 200, studioY, {
      width: 200,
      align: 'right',
    })
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted)
    studioY += 14
    for (const line of studioLines) {
      const height = doc.heightOfString(cleanPdfText(line), { width: 200 })
      doc.text(cleanPdfText(line), PAGE.width - PAGE.margin - 200, studioY, {
        width: 200,
        align: 'right',
      })
      studioY += Math.max(11, height)
    }

    let y = Math.max(206, studioY + 16)
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).strokeColor(COLORS.line).lineWidth(1).stroke()
    y += 20

    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted).text('CLIENT', PAGE.margin, y)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink)
    const clientTitle = optional(client?.company) || optional(client?.contactName) || 'Client to be confirmed'
    doc.text(cleanPdfText(clientTitle), PAGE.margin, y + 14, { width: 235 })
    y += 34
    doc.font('Helvetica').fontSize(8.8).fillColor(COLORS.muted)
    for (const line of [
      optional(client?.contactName) && optional(client?.contactName) !== clientTitle ? cleanPdfText(client.contactName) : null,
      optional(client?.email),
      optional(client?.phone),
      optional(client?.city),
    ].filter(Boolean)) {
      doc.text(cleanPdfText(line), PAGE.margin, y, { width: 235 })
      y += 12
    }

    let summaryY = Math.max(y + 4, 260)
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted).text('PROJECT', PAGE.width - PAGE.margin - 220, summaryY, {
      width: 220,
      align: 'right',
    })
    summaryY += 14
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.ink).text(cleanPdfText(quotation.projectTitle), PAGE.width - PAGE.margin - 220, summaryY, {
      width: 220,
      align: 'right',
    })
    summaryY += 17
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted)
    const projectLines = [
      optional(quotation.eventType),
      quotation.eventDate
        ? `Event date: ${new Date(`${quotation.eventDate}T00:00:00`).toLocaleDateString('en-IN')}`
        : null,
      optional(quotation.venue),
      Number(quotation.guests) > 0 ? `Guests: ${Number(quotation.guests).toLocaleString('en-IN')}` : null,
    ].filter(Boolean)
    for (const line of projectLines) {
      doc.text(cleanPdfText(line), PAGE.width - PAGE.margin - 220, summaryY, {
        width: 220,
        align: 'right',
      })
      summaryY += 12
    }

    y = Math.max(summaryY, y) + 26
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).strokeColor(COLORS.line).stroke()
    y += 14

    const columns = [
      { key: 'description', label: 'DESCRIPTION', x: PAGE.margin, width: 226 },
      { key: 'quantity', label: 'QTY', x: PAGE.margin + 232, width: 38, align: 'right' },
      { key: 'unit', label: 'UNIT', x: PAGE.margin + 274, width: 54, align: 'right' },
      { key: 'rate', label: 'RATE (INR)', x: PAGE.margin + 332, width: 84, align: 'right' },
      { key: 'amount', label: 'AMOUNT (INR)', x: PAGE.margin + 420, width: 79, align: 'right' },
    ]

    const drawTableHeader = () => {
      doc.rect(PAGE.margin, y, contentWidth, 23).fill(COLORS.soft)
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted)
      for (const column of columns) {
        doc.text(column.label, column.x + 4, y + 8, {
          width: column.width - 8,
          align: column.align || 'left',
        })
      }
      y += 23
    }

    drawTableHeader()

    const ensureSpace = (height) => {
      if (y + height < PAGE.height - 100) return
      doc.addPage()
      y = PAGE.margin
      doc.rect(0, 0, PAGE.width, 12).fill(COLORS.accent)
      doc.rect(0, 12, PAGE.width, 3).fill(COLORS.gold)
      drawTableHeader()
    }

    for (const item of quotation.lineItems ?? []) {
      const description = cleanPdfText(item.description, 500)
      const detail = optional(item.detail)
      doc.font('Helvetica').fontSize(8.7)
      const descriptionHeight = doc.heightOfString(description, { width: columns[0].width - 8 })
      const detailHeight = detail
        ? doc.heightOfString(cleanPdfText(detail, 1000), {
            width: columns[0].width - 8,
            lineGap: 1,
          })
        : 0
      const rowHeight = Math.max(27, descriptionHeight + detailHeight + 14)
      ensureSpace(rowHeight)
      doc.font('Helvetica-Bold').fontSize(8.7).fillColor(COLORS.ink).text(description, columns[0].x + 4, y + 8, {
        width: columns[0].width - 8,
        lineGap: 1,
      })
      if (detail) {
        doc.font('Helvetica').fontSize(7.7).fillColor(COLORS.muted).text(cleanPdfText(detail, 1000), columns[0].x + 4, y + 8 + descriptionHeight + 1, {
          width: columns[0].width - 8,
          lineGap: 1,
        })
      }
      doc.font('Helvetica').fontSize(8.7).fillColor(COLORS.ink)
      doc.text(String(item.quantity), columns[1].x + 4, y + 8, {
        width: columns[1].width - 8,
        align: 'right',
      })
      doc.text(cleanPdfText(item.unit || 'unit', 40), columns[2].x + 4, y + 8, {
        width: columns[2].width - 8,
        align: 'right',
      })
      doc.text(inr(item.unitPricePaise).replace('INR ', ''), columns[3].x + 4, y + 8, {
        width: columns[3].width - 8,
        align: 'right',
      })
      doc
        .font('Helvetica-Bold')
        .text(inr(item.quantity * item.unitPricePaise).replace('INR ', ''), columns[4].x + 4, y + 8, {
          width: columns[4].width - 8,
          align: 'right',
        })
      y += rowHeight
      doc.moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).strokeColor(COLORS.line).lineWidth(0.5).stroke()
    }

    y += 14
    const totalsWidth = 228
    const totalsX = PAGE.width - PAGE.margin - totalsWidth
    const totalLine = (label, value, bold = false) => {
      ensureSpace(18)
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 11 : 8.8)
        .fillColor(bold ? COLORS.ink : COLORS.muted)
        .text(label, totalsX, y, { width: 100 })
        .text(value, totalsX + 100, y, { width: totalsWidth - 100, align: 'right' })
      y += bold ? 22 : 15
    }

    totalLine('Subtotal', inr(quotation.subtotalPaise))
    if (quotation.discountPaise > 0) {
      totalLine('Discount', `- ${inr(quotation.discountPaise)}`)
    }
    if (quotation.gstRateBps > 0) {
      totalLine(
        `GST (${(quotation.gstRateBps / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%)`,
        inr(quotation.gstPaise),
      )
    }
    ensureSpace(1)
    doc.moveTo(totalsX, y).lineTo(PAGE.width - PAGE.margin, y).strokeColor(COLORS.line).lineWidth(1).stroke()
    y += 9
    totalLine('TOTAL', inr(quotation.totalPaise), true)

    if (optional(quotation.notes)) {
      ensureSpace(70)
      y += 12
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted).text('NOTES', PAGE.margin, y)
      doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.ink).text(cleanPdfText(quotation.notes, 3000), PAGE.margin, y + 12, {
        width: contentWidth,
        lineGap: 2,
      })
      y += doc.heightOfString(cleanPdfText(quotation.notes, 3000), {
        width: contentWidth,
        lineGap: 2,
      }) + 22
    }

    ensureSpace(46)
    y = Math.max(y + 10, PAGE.height - 94)
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).strokeColor(COLORS.line).stroke()
    y += 10
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(
        'This document reflects the quotation saved in the RH VISUALS studio system. All amounts are in Indian Rupees.',
        PAGE.margin,
        y,
        { width: contentWidth },
      )
    if (quotation.status === 'Draft') {
      doc
        .font('Helvetica-Bold')
        .fontSize(58)
        .fillColor(COLORS.accent)
        .opacity(0.08)
        .rotate(-32, { origin: [PAGE.width / 2, PAGE.height / 2] })
        .text('DRAFT', 40, PAGE.height / 2 - 30, {
          width: PAGE.width - 80,
          align: 'center',
        })
        .rotate(32, { origin: [PAGE.width / 2, PAGE.height / 2] })
        .opacity(1)
    }

    const pageCount = doc.bufferedPageRange().count
    for (let index = 0; index < pageCount; index += 1) {
      doc.switchToPage(index)
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(COLORS.muted)
        .text(
          `${cleanPdfText(quotation.number)}  ·  Page ${index + 1} of ${pageCount}`,
          PAGE.margin,
          PAGE.height - 34,
          { width: contentWidth, align: 'right' },
        )
    }

    doc.end()
  })
}
