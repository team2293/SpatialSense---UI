export function downloadMeasurementsJSON(measurements) {
  const data = measurements.map(m => ({
    name: m.name,
    start: m.start,
    end: m.end,
    distance: m.distance
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'measurements.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadMeasurementsCSV(measurements) {
  const headers = 'Name,Start X,Start Y,Start Z,End X,End Y,End Z,Distance (m)\n';
  const rows = measurements.map(m =>
    `${m.name},${m.start[0].toFixed(4)},${m.start[1].toFixed(4)},${m.start[2].toFixed(4)},${m.end[0].toFixed(4)},${m.end[1].toFixed(4)},${m.end[2].toFixed(4)},${m.distance.toFixed(4)}`
  ).join('\n');
  const blob = new Blob([headers + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'measurements.csv';
  a.click();
  URL.revokeObjectURL(url);
}
