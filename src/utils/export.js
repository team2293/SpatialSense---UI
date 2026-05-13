import { METERS_TO_FEET, SQ_METERS_TO_SQ_FEET } from '../constants';

// Measurement `distance` is stored as a string like "1.234m". Coerce to a
// number when serializing so .toFixed() doesn't throw.
function distanceMeters(m) {
  if (typeof m.distance === 'number') return m.distance;
  return parseFloat(m.distance) || 0;
}

// All UI inputs (start/end coords, distance) are in meters. Convert at the
// export boundary so the file the user downloads matches the unit toggle.
function lenIn(meters, unit) {
  return unit === 'feet' ? meters * METERS_TO_FEET : meters;
}

function areaIn(sqMeters, unit) {
  return unit === 'feet' ? sqMeters * SQ_METERS_TO_SQ_FEET : sqMeters;
}

function lenSuffix(unit) {
  return unit === 'feet' ? 'ft' : 'm';
}

export function downloadMeasurementsJSON(measurements, unit = 'meters') {
  const suffix = lenSuffix(unit);
  const data = {
    unit,
    measurements: measurements.map(m => ({
      name: m.name,
      start: m.start.map(c => lenIn(c, unit)),
      end: m.end.map(c => lenIn(c, unit)),
      [`distance_${suffix}`]: lenIn(distanceMeters(m), unit),
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'measurements.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadMeasurementsCSV(measurements, unit = 'meters') {
  const suffix = lenSuffix(unit);
  const headers = `Name,Start X (${suffix}),Start Y (${suffix}),Start Z (${suffix}),End X (${suffix}),End Y (${suffix}),End Z (${suffix}),Distance (${suffix})\n`;
  const rows = measurements.map(m =>
    `${m.name},${lenIn(m.start[0], unit).toFixed(4)},${lenIn(m.start[1], unit).toFixed(4)},${lenIn(m.start[2], unit).toFixed(4)},${lenIn(m.end[0], unit).toFixed(4)},${lenIn(m.end[1], unit).toFixed(4)},${lenIn(m.end[2], unit).toFixed(4)},${lenIn(distanceMeters(m), unit).toFixed(4)}`
  ).join('\n');
  const blob = new Blob([headers + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'measurements.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Full-report exports (JSON / CSV) ──────────────────────────────
// Same data the PDF report contains, just in a machine-readable form.

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function reportFilename(scanInfo, ext) {
  const name = (scanInfo?.name || 'scan').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  return `spatialsense-report-${name}-${date}.${ext}`;
}

export function downloadReportJSON({ scanInfo, roomDimensions, measurements, areaMeasurements, pointCount, unit }) {
  const u = unit || 'meters';
  const length = roomDimensions?.length || 0;
  const width = roomDimensions?.width || 0;
  const height = roomDimensions?.height || 0;
  const isFeet = u === 'feet';
  const lenUnit = isFeet ? 'ft' : 'm';
  const areaUnit = isFeet ? 'ft2' : 'm2';
  const volUnit = isFeet ? 'ft3' : 'm3';

  const payload = {
    generatedAt: new Date().toISOString(),
    unit: u,
    lengthUnit: lenUnit,
    scan: {
      name: scanInfo?.name || null,
      date: scanInfo?.date || null,
      fileSize: scanInfo?.fileSize || null,
      pointCount: pointCount || null,
    },
    roomDimensions: {
      [`length_${lenUnit}`]: lenIn(length, u),
      [`width_${lenUnit}`]: lenIn(width, u),
      [`height_${lenUnit}`]: lenIn(height, u),
      [`floorArea_${areaUnit}`]: areaIn(length * width, u),
      [`volume_${volUnit}`]: isFeet
        ? length * width * height * 35.3147
        : length * width * height,
    },
    measurements: (measurements || []).map(m => ({
      name: m.name,
      start: m.start.map(c => lenIn(c, u)),
      end: m.end.map(c => lenIn(c, u)),
      [`distance_${lenUnit}`]: lenIn(
        typeof m.distance === 'string' ? parseFloat(m.distance) : m.distance,
        u
      ),
    })),
    areas: (areaMeasurements || []).map(a => ({
      name: a.name,
      [`area_${areaUnit}`]: areaIn(a.area, u),
      vertexCount: a.vertices?.length ?? 0,
      vertices: (a.vertices || []).map(v => v.map(c => lenIn(c, u))),
      centroid: a.centroid ? a.centroid.map(c => lenIn(c, u)) : null,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, reportFilename(scanInfo, 'json'));
}

// Escape a single CSV field per RFC 4180: wrap in quotes if it contains a
// comma, quote, or newline; double any embedded quotes.
function csvField(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadReportCSV({ scanInfo, roomDimensions, measurements, areaMeasurements, pointCount, unit }) {
  const u = unit || 'meters';
  const isFeet = u === 'feet';
  const lenLbl = isFeet ? 'ft' : 'm';
  const areaLbl = isFeet ? 'ft^2' : 'm^2';
  const volLbl = isFeet ? 'ft^3' : 'm^3';

  const length = roomDimensions?.length || 0;
  const width = roomDimensions?.width || 0;
  const height = roomDimensions?.height || 0;
  const volM3 = length * width * height;
  const volOut = isFeet ? volM3 * 35.3147 : volM3;

  const lines = [];

  lines.push('# SpatialSense 3D Scan Report');
  lines.push(`# Generated,${csvField(new Date().toISOString())}`);
  lines.push(`# Unit,${csvField(u)}`);
  lines.push('');

  lines.push('# Scan');
  lines.push('Field,Value');
  lines.push(`Name,${csvField(scanInfo?.name || '')}`);
  lines.push(`Date,${csvField(scanInfo?.date || '')}`);
  lines.push(`File Size,${csvField(scanInfo?.fileSize || '')}`);
  lines.push(`Points,${csvField(pointCount ?? '')}`);
  lines.push('');

  lines.push(`# Room Dimensions (${lenLbl})`);
  lines.push('Property,Value');
  lines.push(`Length,${lenIn(length, u).toFixed(4)}`);
  lines.push(`Width,${lenIn(width, u).toFixed(4)}`);
  lines.push(`Height,${lenIn(height, u).toFixed(4)}`);
  lines.push(`Floor Area (${areaLbl}),${areaIn(length * width, u).toFixed(4)}`);
  lines.push(`Volume (${volLbl}),${volOut.toFixed(4)}`);
  lines.push('');

  lines.push(`# Measurements (${lenLbl})`);
  lines.push(`Name,Start X (${lenLbl}),Start Y (${lenLbl}),Start Z (${lenLbl}),End X (${lenLbl}),End Y (${lenLbl}),End Z (${lenLbl}),Distance (${lenLbl})`);
  for (const m of measurements || []) {
    const distM = typeof m.distance === 'string' ? parseFloat(m.distance) : m.distance;
    lines.push([
      csvField(m.name),
      lenIn(m.start[0], u).toFixed(4),
      lenIn(m.start[1], u).toFixed(4),
      lenIn(m.start[2], u).toFixed(4),
      lenIn(m.end[0], u).toFixed(4),
      lenIn(m.end[1], u).toFixed(4),
      lenIn(m.end[2], u).toFixed(4),
      lenIn(distM || 0, u).toFixed(4),
    ].join(','));
  }
  lines.push('');

  lines.push(`# Areas (${areaLbl})`);
  lines.push(`Name,Vertex Count,Area (${areaLbl}),Centroid X (${lenLbl}),Centroid Y (${lenLbl}),Centroid Z (${lenLbl})`);
  for (const a of areaMeasurements || []) {
    const c = a.centroid || [0, 0, 0];
    lines.push([
      csvField(a.name),
      String(a.vertices?.length ?? 0),
      areaIn(a.area || 0, u).toFixed(4),
      lenIn(c[0], u).toFixed(4),
      lenIn(c[1], u).toFixed(4),
      lenIn(c[2], u).toFixed(4),
    ].join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  triggerDownload(blob, reportFilename(scanInfo, 'csv'));
}
