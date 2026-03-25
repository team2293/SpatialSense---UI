import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ScanStatus, startScan, stopScan, getScanStatus, DEV_MODE } from '../services/scannerApi';
import { downloadPlyFromS3 } from '../services/s3Service';

const POLL_INTERVAL_MS = 500;

const ROOM_TYPES = [
  'Select type...',
  'Office',
  'Conference Room',
  'Lobby / Reception',
  'Hallway / Corridor',
  'Warehouse',
  'Mechanical Room',
  'Restroom',
  'Stairwell',
  'Retail Space',
  'Residential',
  'Other',
];

// Icons
const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ScanIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
  </svg>
);

const Spinner = () => (
  <svg className="w-12 h-12 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const CheckCircle = () => (
  <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function NewScanView({ onBack, onScanComplete }) {
  const [scanName, setScanName] = useState('');
  const [projectNumber, setProjectNumber] = useState('');
  const [location, setLocation] = useState('');
  const [floor, setFloor] = useState('');
  const [roomType, setRoomType] = useState(ROOM_TYPES[0]);
  const [notes, setNotes] = useState('');

  const [status, setStatus] = useState(ScanStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState('');
  const [s3Key, setS3Key] = useState(null);
  const pollRef = useRef(null);

  const isScanning = status === ScanStatus.SCANNING;
  const canStart = scanName.trim().length > 0;

  // Poll for scan status while scanning
  useEffect(() => {
    if (!isScanning) {
      clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const data = await getScanStatus();
        setStatus(data.status);

        if (data.status === ScanStatus.COMPLETE) {
          if (data.s3Key) setS3Key(data.s3Key);
          clearInterval(pollRef.current);
        }
        if (data.status === ScanStatus.ERROR) {
          setErrorMsg(data.message || 'An unknown error occurred');
          clearInterval(pollRef.current);
        }
      } catch {
        // If we can't reach the Jetson, keep trying
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollRef.current);
  }, [isScanning]);

  // Auto-load result when scan completes
  useEffect(() => {
    if (status !== ScanStatus.COMPLETE || !s3Key) return;

    let cancelled = false;
    (async () => {
      try {
        const blob = await downloadPlyFromS3(s3Key);
        if (cancelled) return;
        const file = new File([blob], `${scanName.trim() || 'scan'}.ply`, { type: 'application/octet-stream' });
        onScanComplete(file);
      } catch (err) {
        if (!cancelled) setErrorMsg(`Failed to download scan: ${err.message}`);
      }
    })();
    return () => { cancelled = true; };
  }, [status, s3Key, scanName, onScanComplete]);

  const handleStart = useCallback(async () => {
    setErrorMsg('');
    setS3Key(null);
    setStatus(ScanStatus.SCANNING);
    try {
      await startScan({
        name: scanName.trim(),
        projectNumber: projectNumber.trim(),
        location: location.trim(),
        floor: floor.trim(),
        roomType: roomType !== ROOM_TYPES[0] ? roomType : undefined,
        notes: notes.trim(),
      });
    } catch (err) {
      setErrorMsg(`Could not connect to scanner: ${err.message}`);
      setStatus(ScanStatus.ERROR);
    }
  }, [scanName, projectNumber, location, floor, roomType, notes]);

  const handleStop = useCallback(async () => {
    try {
      await stopScan();
    } catch {
      // Force UI back to idle even if stop request fails
    }
    setStatus(ScanStatus.IDLE);
  }, []);

  const fieldClass = 'w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-40 text-sm';

  return (
    <div className="w-full h-screen bg-zinc-900 flex flex-col font-sans text-sm">
      {/* Header */}
      <div className="border-b border-zinc-700 bg-zinc-800 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              disabled={isScanning}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <BackIcon />
              <span className="text-xs">Back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                <span className="text-orange-500">Spatial</span>Sense
              </h1>
              <p className="text-zinc-500 text-xs mt-0.5">New Scan Capture</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {DEV_MODE && (
              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded text-[10px] font-semibold uppercase tracking-wider">
                Sim
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-orange-500 animate-pulse' : status === ScanStatus.COMPLETE ? 'bg-green-500' : 'bg-zinc-500'}`} />
              {isScanning ? 'Scanning...' : status === ScanStatus.COMPLETE ? 'Complete' : 'Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-start justify-center px-8 py-8 overflow-auto">
        <div className="w-full max-w-2xl">

          {/* Scanning Overlay — replaces form while scanning */}
          {(isScanning || status === ScanStatus.COMPLETE) ? (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-12 flex flex-col items-center justify-center text-center">
              {isScanning ? (
                <>
                  <Spinner />
                  <p className="text-white text-lg font-medium mt-6">Scanning...</p>
                  <p className="text-zinc-500 text-sm mt-2">Capturing 3D point cloud of the room</p>
                  <button
                    onClick={handleStop}
                    className="mt-8 flex items-center gap-2 px-5 py-2.5 bg-zinc-700 hover:bg-red-600 text-zinc-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <StopIcon />
                    Abort Scan
                  </button>
                </>
              ) : (
                <>
                  <CheckCircle />
                  <p className="text-white text-lg font-medium mt-6">Scan Complete</p>
                  <p className="text-zinc-500 text-sm mt-2">Loading into viewer...</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Form Section */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-zinc-700">
                  <h2 className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">Scan Details</h2>
                </div>

                <div className="p-5 space-y-4">
                  {/* Row 1: Scan Name + Project # */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-zinc-500 text-xs mb-1">
                        Scan Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={scanName}
                        onChange={(e) => setScanName(e.target.value)}
                        placeholder="e.g. Suite 200 — Main Office"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 text-xs mb-1">Project / Job #</label>
                      <input
                        type="text"
                        value={projectNumber}
                        onChange={(e) => setProjectNumber(e.target.value)}
                        placeholder="e.g. PRJ-2026-042"
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  {/* Row 2: Location */}
                  <div>
                    <label className="block text-zinc-500 text-xs mb-1">Site Address / Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. 1200 Commerce Blvd, Austin, TX"
                      className={fieldClass}
                    />
                  </div>

                  {/* Row 3: Floor + Room Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-zinc-500 text-xs mb-1">Floor / Level</label>
                      <input
                        type="text"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        placeholder="e.g. 2nd Floor"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 text-xs mb-1">Room Type</label>
                      <select
                        value={roomType}
                        onChange={(e) => setRoomType(e.target.value)}
                        className={fieldClass}
                      >
                        {ROOM_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Notes */}
                  <div>
                    <label className="block text-zinc-500 text-xs mb-1">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional details — existing conditions, obstructions, scope of work..."
                      rows={3}
                      className={`${fieldClass} resize-none`}
                    />
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
                  <p className="text-red-400 text-sm">{errorMsg}</p>
                  <button
                    onClick={() => setErrorMsg('')}
                    className="text-red-400 hover:text-red-300 text-xs ml-4"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-6">
                <button
                  onClick={handleStart}
                  disabled={!canStart}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  <ScanIcon />
                  Begin Capture
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-700 bg-zinc-800 px-8 py-2">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>SpatialSense v1.0 &mdash; Senior Design 2026</span>
          <span>Orbec Depth Camera &mdash; Jetson Nano Orin Super</span>
        </div>
      </div>
    </div>
  );
}
