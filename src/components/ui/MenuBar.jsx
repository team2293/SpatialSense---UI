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

export default function MenuBar({
  activeMenu,
  toggleMenu,
  setActiveMenu,
  selectedView,
  setSelectedView,
  showGrid,
  setShowGrid,
  showAxes,
  setShowAxes,
  showDimensions,
  setShowDimensions,
  showRoomBounds,
  setShowRoomBounds,
  isViewLocked,
  setIsViewLocked,
  activeTool,
  setActiveTool,
  axisConstraint,
  setAxisConstraint,
  measurements,
  clearMeasurements,
  exportMeasurementsJSON,
  exportMeasurementsCSV,
  openReportPreview,
  screenshotViewport,
  scannerState,
  connectToScanner,
  startScan,
  disconnectScanner,
  loadDemoData,
  loadPlyFromUrl,
  connectionUrl,
  setConnectionUrl,
  fileInputRef,
  handleFileSelect,
  menuBarRef,
  unit,
  setUnit,
  selectedMeasurement,
  deleteSelectedMeasurement,
  startRename,
  scannerMessage,
  onNewProject,
  onBack,
}) {
  return (
      <div className="bg-zinc-800 border-b border-zinc-700 px-2 py-1 flex items-center justify-between">
        <div className="flex items-center gap-1" ref={menuBarRef}>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2 py-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors mr-1"
              title="Back to Dashboard"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-xs">Dashboard</span>
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-1">
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            </div>
            <span className="text-zinc-300 font-medium">SpatialSense</span>
          </div>
          <div className="h-4 w-px bg-zinc-700 mx-2"></div>

          {/* ── File Menu ── */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('file')}
              onMouseEnter={() => activeMenu && setActiveMenu('file')}
              className={`px-3 py-1 rounded transition ${activeMenu === 'file' ? 'text-white bg-zinc-700' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
            >File</button>
            {activeMenu === 'file' && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50 py-1">
                <button onClick={() => { fileInputRef.current?.click(); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>Open PLY File...</span><span className="text-zinc-500 text-xs">Ctrl+O</span>
                </button>
                <button onClick={() => { connectToScanner(); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white">
                  Connect Scanner
                </button>
                <button onClick={() => { loadDemoData(); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white">
                  Load Demo Scene
                </button>
                <div className="border-t border-zinc-700 my-1"></div>
                <button onClick={exportMeasurementsJSON} className={`w-full text-left px-4 py-1.5 flex items-center justify-between ${measurements.length > 0 ? 'text-zinc-300 hover:bg-zinc-700 hover:text-white' : 'text-zinc-600 cursor-not-allowed'}`} disabled={measurements.length === 0}>
                  <span>Save Measurements (.json)</span><span className="text-zinc-500 text-xs">Ctrl+S</span>
                </button>
                <button onClick={exportMeasurementsCSV} className={`w-full text-left px-4 py-1.5 ${measurements.length > 0 ? 'text-zinc-300 hover:bg-zinc-700 hover:text-white' : 'text-zinc-600 cursor-not-allowed'}`} disabled={measurements.length === 0}>
                  Save Measurements (.csv)
                </button>
                <div className="border-t border-zinc-700 my-1"></div>
                <button onClick={() => { onNewProject(); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white">
                  New Project
                </button>
              </div>
            )}
          </div>

          {/* ── Edit Menu ── */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('edit')}
              onMouseEnter={() => activeMenu && setActiveMenu('edit')}
              className={`px-3 py-1 rounded transition ${activeMenu === 'edit' ? 'text-white bg-zinc-700' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
            >Edit</button>
            {activeMenu === 'edit' && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50 py-1">
                <button onClick={() => { deleteSelectedMeasurement(); setActiveMenu(null); }} className={`w-full text-left px-4 py-1.5 flex items-center justify-between ${selectedMeasurement ? 'text-zinc-300 hover:bg-zinc-700 hover:text-white' : 'text-zinc-600 cursor-not-allowed'}`} disabled={!selectedMeasurement}>
                  <span>Delete Measurement</span><span className="text-zinc-500 text-xs">Del</span>
                </button>
                <button onClick={() => { clearMeasurements(); setActiveMenu(null); }} className={`w-full text-left px-4 py-1.5 ${measurements.length > 0 ? 'text-zinc-300 hover:bg-zinc-700 hover:text-white' : 'text-zinc-600 cursor-not-allowed'}`} disabled={measurements.length === 0}>
                  Clear All Measurements
                </button>
                <div className="border-t border-zinc-700 my-1"></div>
                <button onClick={() => { if (selectedMeasurement) { const m = measurements.find(x => x.id === selectedMeasurement); if (m) startRename(m.id, m.name); } setActiveMenu(null); }} className={`w-full text-left px-4 py-1.5 flex items-center justify-between ${selectedMeasurement ? 'text-zinc-300 hover:bg-zinc-700 hover:text-white' : 'text-zinc-600 cursor-not-allowed'}`} disabled={!selectedMeasurement}>
                  <span>Rename Measurement</span><span className="text-zinc-500 text-xs">F2</span>
                </button>
                <div className="border-t border-zinc-700 my-1"></div>
                <button onClick={() => { setUnit(unit === 'meters' ? 'feet' : 'meters'); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white">
                  Switch to {unit === 'meters' ? 'Feet' : 'Meters'}
                </button>
              </div>
            )}
          </div>

          {/* ── View Menu ── */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('view')}
              onMouseEnter={() => activeMenu && setActiveMenu('view')}
              className={`px-3 py-1 rounded transition ${activeMenu === 'view' ? 'text-white bg-zinc-700' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
            >View</button>
            {activeMenu === 'view' && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50 py-1">
                <button onClick={() => { setSelectedView('perspective'); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>3D Perspective</span>{selectedView === 'perspective' && <span className="text-blue-400">✓</span>}
                </button>
                <button onClick={() => { setSelectedView('top'); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>Top View</span>{selectedView === 'top' && <span className="text-blue-400">✓</span>}
                </button>
                <button onClick={() => { setSelectedView('front'); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>Front View</span>{selectedView === 'front' && <span className="text-blue-400">✓</span>}
                </button>
                <button onClick={() => { setSelectedView('side'); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>Side View</span>{selectedView === 'side' && <span className="text-blue-400">✓</span>}
                </button>
                <button onClick={() => { setSelectedView('inside'); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>Inside View</span>{selectedView === 'inside' && <span className="text-blue-400">✓</span>}
                </button>
                <div className="border-t border-zinc-700 my-1"></div>
                <button onClick={() => { setShowGrid(prev => !prev); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>Show Grid</span>{showGrid && <span className="text-blue-400">✓</span>}
                </button>
                <button onClick={() => { setShowAxes(prev => !prev); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>Show Axes</span>{showAxes && <span className="text-blue-400">✓</span>}
                </button>
                <button onClick={() => { setShowDimensions(prev => !prev); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>Show Dimensions</span>{showDimensions && <span className="text-blue-400">✓</span>}
                </button>
                <button onClick={() => { setShowRoomBounds(prev => !prev); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>Show Room Bounds</span>{showRoomBounds && <span className="text-blue-400">✓</span>}
                </button>
                <div className="border-t border-zinc-700 my-1"></div>
                <button onClick={() => { setIsViewLocked(prev => !prev); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>{isViewLocked ? 'Unlock Camera' : 'Lock Camera'}</span><span className="text-zinc-500 text-xs">L</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Measure Menu ── */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('measure')}
              onMouseEnter={() => activeMenu && setActiveMenu('measure')}
              className={`px-3 py-1 rounded transition ${activeMenu === 'measure' ? 'text-white bg-zinc-700' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
            >Measure</button>
            {activeMenu === 'measure' && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50 py-1">
                <button onClick={() => { setActiveTool('measure'); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>New Measurement</span>{activeTool === 'measure' && <span className="text-blue-400">✓</span>}
                </button>
                <button onClick={() => { setActiveTool('select'); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>Select Tool</span>{activeTool === 'select' && <span className="text-blue-400">✓</span>}
                </button>
                <div className="border-t border-zinc-700 my-1"></div>
                <button onClick={() => { setAxisConstraint(axisConstraint === 'x' ? null : 'x'); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">Constrain to X Axis{axisConstraint === 'x' && <span className="text-red-400">✓</span>}</span><span className="text-zinc-500 text-xs">⇧⌘X</span>
                </button>
                <button onClick={() => { setAxisConstraint(axisConstraint === 'y' ? null : 'y'); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">Constrain to Y Axis{axisConstraint === 'y' && <span className="text-green-400">✓</span>}</span><span className="text-zinc-500 text-xs">⇧⌘Y</span>
                </button>
                <button onClick={() => { setAxisConstraint(axisConstraint === 'z' ? null : 'z'); setActiveMenu(null); }} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">Constrain to Z Axis{axisConstraint === 'z' && <span className="text-blue-400">✓</span>}</span><span className="text-zinc-500 text-xs">⇧⌘Z</span>
                </button>
                <div className="border-t border-zinc-700 my-1"></div>
                <button onClick={() => { clearMeasurements(); setActiveMenu(null); }} className={`w-full text-left px-4 py-1.5 ${measurements.length > 0 ? 'text-zinc-300 hover:bg-zinc-700 hover:text-white' : 'text-zinc-600 cursor-not-allowed'}`} disabled={measurements.length === 0}>
                  Clear All Measurements
                </button>
              </div>
            )}
          </div>

          {/* ── Export Menu ── */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('export')}
              onMouseEnter={() => activeMenu && setActiveMenu('export')}
              className={`px-3 py-1 rounded transition ${activeMenu === 'export' ? 'text-white bg-zinc-700' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
            >Export</button>
            {activeMenu === 'export' && (
              <div className="absolute left-0 top-full mt-1 w-60 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50 py-1">
                <button onClick={openReportPreview} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-between">
                  <span>Generate Report (PDF)</span>
                  <span className="text-orange-400 text-xs font-semibold">NEW</span>
                </button>
                <div className="border-t border-zinc-700 my-1"></div>
                <button onClick={exportMeasurementsJSON} className={`w-full text-left px-4 py-1.5 ${measurements.length > 0 ? 'text-zinc-300 hover:bg-zinc-700 hover:text-white' : 'text-zinc-600 cursor-not-allowed'}`} disabled={measurements.length === 0}>
                  Export Measurements as JSON
                </button>
                <button onClick={exportMeasurementsCSV} className={`w-full text-left px-4 py-1.5 ${measurements.length > 0 ? 'text-zinc-300 hover:bg-zinc-700 hover:text-white' : 'text-zinc-600 cursor-not-allowed'}`} disabled={measurements.length === 0}>
                  Export Measurements as CSV
                </button>
                <div className="border-t border-zinc-700 my-1"></div>
                <button onClick={screenshotViewport} className="w-full text-left px-4 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white">
                  Screenshot Viewport
                </button>
              </div>
            )}
          </div>

          {/* ── Help Menu ── */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('help')}
              onMouseEnter={() => activeMenu && setActiveMenu('help')}
              className={`px-3 py-1 rounded transition ${activeMenu === 'help' ? 'text-white bg-zinc-700' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
            >Help</button>
            {activeMenu === 'help' && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50 py-1">
                <div className="px-4 py-1.5 text-zinc-500 text-xs uppercase tracking-wider">Keyboard Shortcuts</div>
                <div className="px-4 py-1 text-zinc-400 text-xs flex justify-between"><span>Measure tool</span><span className="text-zinc-500">Click two points</span></div>
                <div className="px-4 py-1 text-zinc-400 text-xs flex justify-between"><span>Constrain X / Y / Z</span><span className="text-zinc-500">⇧⌘X / ⇧⌘Y / ⇧⌘Z</span></div>
                <div className="px-4 py-1 text-zinc-400 text-xs flex justify-between"><span>Lock camera</span><span className="text-zinc-500">L</span></div>
                <div className="px-4 py-1 text-zinc-400 text-xs flex justify-between"><span>Delete measurement</span><span className="text-zinc-500">Del</span></div>
                <div className="px-4 py-1 text-zinc-400 text-xs flex justify-between"><span>Deselect / Cancel</span><span className="text-zinc-500">Esc</span></div>
                <div className="border-t border-zinc-700 my-1"></div>
                <div className="px-4 py-1.5 text-zinc-500 text-xs uppercase tracking-wider">About</div>
                <div className="px-4 py-1.5 text-zinc-400 text-xs">SpatialSense — 3D Room Scanner & Measurement Tool</div>
                <div className="px-4 py-1.5 text-zinc-400 text-xs">Senior Design Project</div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Hidden file input for PLY files */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".ply"
            className="hidden"
          />

          {/* Scanner Connection Controls */}
          {scannerState === ScannerState.DISCONNECTED ? (
            <>
              <button
                onClick={connectToScanner}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-xs flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Connect Scanner
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition text-xs flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Load PLY
              </button>
              <button
                onClick={loadDemoData}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition text-xs"
              >
                Demo
              </button>
            </>
          ) : scannerState === ScannerState.CONNECTED || scannerState === ScannerState.MODEL_LOADED ? (
            <>
              <button
                onClick={startScan}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition text-xs flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                {scannerState === ScannerState.MODEL_LOADED ? 'Rescan' : 'Start Scan'}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition text-xs flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Load PLY
              </button>
              <button
                onClick={disconnectScanner}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition text-xs"
              >
                Disconnect
              </button>
            </>
          ) : (
            <span className="text-zinc-400 text-xs animate-pulse">{scannerMessage}</span>
          )}
          <div className="h-4 w-px bg-zinc-700 mx-2"></div>
          <button
            onClick={openReportPreview}
            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export
          </button>
        </div>
      </div>
  );
}
