// Scanner API service — communicates with the Jetson Nano Orin Super
// Update JETSON_BASE_URL to match your Jetson's IP and port

const JETSON_BASE_URL = 'http://192.168.1.100:5000';

// ─── Dev Mode Toggle ──────────────────────────────────────────
// Set to true to simulate scans without the Jetson connected.
// Set to false when the real hardware is ready.
//export const DEV_MODE = true;
export const DEV_MODE = false;

// Mock scan duration in dev mode (ms)
const MOCK_SCAN_DURATION = 6000;

export const ScanStatus = {
  IDLE: 'idle',
  SCANNING: 'scanning',
  COMPLETE: 'complete',
  ERROR: 'error',
};

// ─── Mock Simulation ──────────────────────────────────────────

let mockStartTime = null;
let mockRunning = false;

function getMockStatus() {
  if (!mockRunning) return { status: ScanStatus.IDLE };

  const elapsed = Date.now() - mockStartTime;

  if (elapsed >= MOCK_SCAN_DURATION) {
    mockRunning = false;
    return {
      status: ScanStatus.COMPLETE,
      s3Key: `scans/mock-scan-${Date.now()}.ply`,
    };
  }

  return { status: ScanStatus.SCANNING };
}

// ─── Jetson API ───────────────────────────────────────────────

// Tells the Jetson to start the scan program (teammate's code).
// The Jetson handles: servo control, camera capture, PLY generation, and S3 upload.
// scanDetails: { name, projectNumber, location, floor, roomType, notes }
export async function startScan(scanDetails) {
  if (DEV_MODE) {
    mockStartTime = Date.now();
    mockRunning = true;
    return { ok: true, mock: true };
  }

  const res = await fetch(`${JETSON_BASE_URL}/scan/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scanDetails),
  });
  if (!res.ok) throw new Error(`Failed to start scan: ${res.statusText}`);
  return res.json();
}

export async function stopScan() {
  if (DEV_MODE) {
    mockRunning = false;
    mockStartTime = null;
    return { ok: true, mock: true };
  }

  const res = await fetch(`${JETSON_BASE_URL}/scan/stop`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to stop scan: ${res.statusText}`);
  return res.json();
}

export async function getScanStatus() {
  if (DEV_MODE) {
    return getMockStatus();
  }

  const res = await fetch(`${JETSON_BASE_URL}/scan/status`);
  if (!res.ok) throw new Error(`Failed to get status: ${res.statusText}`);
  return res.json();
  // Expected response shape:
  // {
  //   status: 'idle' | 'scanning' | 'complete' | 'error',
  //   message: string,
  //   s3Key: string (only present when status is 'complete')
  // }
}

