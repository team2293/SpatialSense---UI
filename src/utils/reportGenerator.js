import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Parse "1.234m" → 1.234 (meters)
function parseDistance(distanceStr) {
  if (typeof distanceStr === 'number') return distanceStr;
  return parseFloat(distanceStr) || 0;
}

function formatMeters(m, unit) {
  if (unit === 'feet') return `${(m * 3.28084).toFixed(3)} ft`;
  return `${m.toFixed(3)} m`;
}

function formatCoord(value, unit) {
  if (unit === 'feet') return (value * 3.28084).toFixed(3);
  return value.toFixed(3);
}

export function generateReportPdf({
  scanInfo,
  roomDimensions,
  measurements,
  pointCount,
  screenshotDataUrl,
  unit = 'meters',
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;

  // ─── Header ─────────────────────────────────────────
  doc.setFillColor(24, 24, 27); // zinc-900
  doc.rect(0, 0, pageWidth, 72, 'F');

  doc.setTextColor(249, 115, 22); // orange-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Spatial', margin, 42);
  const spatialWidth = doc.getTextWidth('Spatial');
  doc.setTextColor(255, 255, 255);
  doc.text('Sense', margin + spatialWidth, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text('3D Room Scan Report', margin, 58);

  doc.setFontSize(9);
  doc.setTextColor(161, 161, 170);
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const dateWidth = doc.getTextWidth(dateStr);
  doc.text(dateStr, pageWidth - margin - dateWidth, 42);

  let cursorY = 100;

  // ─── Scan Info ──────────────────────────────────────
  doc.setTextColor(24, 24, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(scanInfo?.name || 'Untitled Scan', margin, cursorY);
  cursorY += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(82, 82, 91); // zinc-600

  const infoLines = [];
  if (scanInfo?.date) infoLines.push(`Scan date: ${scanInfo.date}`);
  if (scanInfo?.fileSize) infoLines.push(`File size: ${scanInfo.fileSize}`);
  if (pointCount) infoLines.push(`Points: ${pointCount.toLocaleString()}`);

  infoLines.forEach((line) => {
    doc.text(line, margin, cursorY);
    cursorY += 14;
  });

  cursorY += 10;

  // ─── Screenshot ─────────────────────────────────────
  if (screenshotDataUrl) {
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = imgWidth * 0.5625; // 16:9 aspect

    try {
      doc.addImage(screenshotDataUrl, 'PNG', margin, cursorY, imgWidth, imgHeight);
      cursorY += imgHeight + 8;

      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      doc.setFont('helvetica', 'italic');
      doc.text('Figure 1: 3D scan viewport', margin, cursorY);
      cursorY += 24;
    } catch (err) {
      console.error('Failed to add screenshot:', err);
    }
  }

  // ─── Room Dimensions ────────────────────────────────
  if (cursorY > pageHeight - 200) {
    doc.addPage();
    cursorY = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text('Room Dimensions', margin, cursorY);
  cursorY += 6;

  doc.setDrawColor(228, 228, 231);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 16;

  const length = roomDimensions?.length || 0;
  const width = roomDimensions?.width || 0;
  const height = roomDimensions?.height || 0;
  const area = length * width;
  const volume = length * width * height;

  autoTable(doc, {
    startY: cursorY,
    head: [['Property', 'Value']],
    body: [
      ['Length', formatMeters(length, unit)],
      ['Width', formatMeters(width, unit)],
      ['Height', formatMeters(height, unit)],
      ['Floor Area', unit === 'feet'
        ? `${(area * 10.7639).toFixed(2)} ft²`
        : `${area.toFixed(2)} m²`],
      ['Volume', unit === 'feet'
        ? `${(volume * 35.3147).toFixed(2)} ft³`
        : `${volume.toFixed(2)} m³`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [39, 39, 42], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10, textColor: [39, 39, 42] },
    alternateRowStyles: { fillColor: [244, 244, 245] },
    margin: { left: margin, right: margin },
  });

  cursorY = doc.lastAutoTable.finalY + 24;

  // ─── Measurements Table ─────────────────────────────
  if (measurements && measurements.length > 0) {
    if (cursorY > pageHeight - 150) {
      doc.addPage();
      cursorY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(24, 24, 27);
    doc.text(`Measurements (${measurements.length})`, margin, cursorY);
    cursorY += 6;

    doc.setDrawColor(228, 228, 231);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 12;

    const unitSuffix = unit === 'feet' ? '(ft)' : '(m)';

    autoTable(doc, {
      startY: cursorY,
      head: [[
        'Name',
        `Start X ${unitSuffix}`,
        `Start Y ${unitSuffix}`,
        `Start Z ${unitSuffix}`,
        `End X ${unitSuffix}`,
        `End Y ${unitSuffix}`,
        `End Z ${unitSuffix}`,
        'Distance',
      ]],
      body: measurements.map((m) => [
        m.name,
        formatCoord(m.start[0], unit),
        formatCoord(m.start[1], unit),
        formatCoord(m.start[2], unit),
        formatCoord(m.end[0], unit),
        formatCoord(m.end[1], unit),
        formatCoord(m.end[2], unit),
        formatMeters(parseDistance(m.distance), unit),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [39, 39, 42], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [39, 39, 42] },
      alternateRowStyles: { fillColor: [244, 244, 245] },
      margin: { left: margin, right: margin },
    });

    cursorY = doc.lastAutoTable.finalY + 16;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122);
    doc.text('No measurements recorded.', margin, cursorY);
  }

  // ─── Footer on every page ───────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170);
    doc.text(
      `SpatialSense 3D Scan Report — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: 'center' }
    );
  }

  return doc;
}

export function getReportFilename(scanInfo) {
  const name = (scanInfo?.name || 'scan').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  return `spatialsense-report-${name}-${date}.pdf`;
}
