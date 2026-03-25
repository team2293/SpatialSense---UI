// Scanner API service — communicates with the Jetson via S3
//
// How it works:
//   1. UI writes commands/start-scan.json to S3
//   2. Jetson polls S3 for that file, picks it up, starts scan
//   3. Jetson writes commands/scan-status.json with progress
//   4. Jetson uploads PLY to S3 when done
//   5. UI detects new PLY file and loads it

import { writeScanCommand, writeStopCommand, checkForNewPly } from './s3Service';

import { DEV_MODE } from './awsConfig';
export { DEV_MODE }; // Re-export so existing imports still work

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
      s3Key: `mock-scan-${Date.now()}.ply`,
    };
  }

  return { status: ScanStatus.SCANNING };
}

// ─── Scan API (via S3) ──────────────────────────────────────

// Tracks when the current scan started, so we can detect new PLY files
let scanStartedAt = null;

// Tells the Jetson to start scanning by writing a command file to S3.
// scanDetails: { name, projectNumber, location, floor, roomType, notes }
export async function startScan(scanDetails) {
  if (DEV_MODE) {
    mockStartTime = Date.now();
    mockRunning = true;
    return { ok: true, mock: true };
  }

  scanStartedAt = new Date();
  await writeScanCommand(scanDetails);
}

export async function stopScan() {
  if (DEV_MODE) {
    mockRunning = false;
    mockStartTime = null;
    return { ok: true, mock: true };
  }

  await writeStopCommand();
}

// Checks scan status by looking for new PLY files in the bucket.
// No noisy 404s — just lists files and checks timestamps.
export async function getScanStatus() {
  if (DEV_MODE) {
    return getMockStatus();
  }

  if (scanStartedAt) {
    const newPlyKey = await checkForNewPly(scanStartedAt);
    if (newPlyKey) {
      return { status: ScanStatus.COMPLETE, s3Key: newPlyKey };
    }
  }

  return { status: ScanStatus.SCANNING };
}
