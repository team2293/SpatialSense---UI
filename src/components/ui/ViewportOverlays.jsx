import React from 'react';

const ScannerState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  SCANNING: 'scanning',
  PROCESSING: 'processing',
  MODEL_LOADED: 'model_loaded',
  ERROR: 'error'
};

const METERS_TO_FEET = 3.28084;

export default function ViewportOverlays({
  activeTool,
  setActiveTool,
  measurementStart,
  selectedMeasurement,
  setSelectedMeasurement,
  axisConstraint,
  setAxisConstraint,
  isViewLocked,
  setIsViewLocked,
  isDraggingPoint,
  deleteSelectedMeasurement,
  pointCloud,
  cursorPosition,
  scannerState,
  selectedView,
  unit,
}) {
  return (
    <>
            {/* Tool Status Overlay */}
            {activeTool === 'measure' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded font-medium text-sm">
                <div>
                  {measurementStart
                    ? 'Click second point to complete measurement'
                    : 'Click first point to start measuring'}
                </div>
                <div className="text-yellow-500/70 text-xs mt-1">
                  {selectedView === 'top' && '📐 Top view: Measuring on horizontal (XZ) plane'}
                  {selectedView === 'front' && '📐 Front view: Measuring on vertical front (XY) plane'}
                  {selectedView === 'side' && '📐 Side view: Measuring on vertical side (YZ) plane'}
                  {selectedView === 'perspective' && '📐 3D view: Measuring on ground plane (switch views for vertical)'}
                </div>
              </div>
            )}

            {/* Axis Constraint Controls - shown when measurement is selected */}
            {selectedMeasurement && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-800/95 border border-zinc-600 rounded-lg shadow-lg p-2 flex items-center gap-2">
                <span className="text-zinc-400 text-xs mr-1">Lock Axis:</span>
                <button
                  onClick={() => setAxisConstraint(axisConstraint === 'x' ? null : 'x')}
                  className={`w-7 h-7 rounded font-bold text-xs transition ${
                    axisConstraint === 'x'
                      ? 'bg-red-500 text-white'
                      : 'bg-zinc-700 text-red-400 hover:bg-zinc-600'
                  }`}
                  title="Lock to X axis (red)"
                >
                  X
                </button>
                <button
                  onClick={() => setAxisConstraint(axisConstraint === 'y' ? null : 'y')}
                  className={`w-7 h-7 rounded font-bold text-xs transition ${
                    axisConstraint === 'y'
                      ? 'bg-green-500 text-white'
                      : 'bg-zinc-700 text-green-400 hover:bg-zinc-600'
                  }`}
                  title="Lock to Y axis (green)"
                >
                  Y
                </button>
                <button
                  onClick={() => setAxisConstraint(axisConstraint === 'z' ? null : 'z')}
                  className={`w-7 h-7 rounded font-bold text-xs transition ${
                    axisConstraint === 'z'
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-700 text-blue-400 hover:bg-zinc-600'
                  }`}
                  title="Lock to Z axis (blue)"
                >
                  Z
                </button>
                <div className="w-px h-5 bg-zinc-600 mx-1"></div>
                <button
                  onClick={() => setIsViewLocked(!isViewLocked)}
                  className={`w-7 h-7 rounded transition flex items-center justify-center ${
                    isViewLocked
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                  }`}
                  title={isViewLocked ? "Unlock camera rotation" : "Lock camera rotation"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isViewLocked ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    )}
                  </svg>
                </button>
                <button
                  onClick={deleteSelectedMeasurement}
                  className="w-7 h-7 rounded bg-zinc-700 text-zinc-400 hover:bg-red-600 hover:text-white transition flex items-center justify-center"
                  title="Delete measurement"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedMeasurement(null)}
                  className="w-7 h-7 rounded bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-white transition flex items-center justify-center"
                  title="Deselect"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Empty State */}
            {pointCloud.length === 0 && scannerState !== ScannerState.SCANNING && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 text-zinc-700">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                  </div>
                  <p className="text-zinc-600 text-sm">No model loaded</p>
                  <p className="text-zinc-700 text-xs mt-1">Connect a scanner or load demo data</p>
                </div>
              </div>
            )}

            {/* Coordinates */}
            <div className="absolute bottom-4 left-4 text-zinc-500 text-xs font-mono bg-zinc-900/80 px-2 py-1 rounded">
              X: {unit === 'feet' ? (parseFloat(cursorPosition.x) * METERS_TO_FEET).toFixed(3) : cursorPosition.x}
              Y: {unit === 'feet' ? (parseFloat(cursorPosition.y) * METERS_TO_FEET).toFixed(3) : cursorPosition.y}
              Z: {unit === 'feet' ? (parseFloat(cursorPosition.z) * METERS_TO_FEET).toFixed(3) : cursorPosition.z}
            </div>
    </>
  );
}
